"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const MAX_TENTATIVES = 5;
const FENETRE_MINUTES = 15;

async function tropDeTentatives(supabaseAdmin: ReturnType<typeof createServiceRoleClient>, identifiant: string) {
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifiant", identifiant)
    .eq("portail", "admin")
    .eq("reussi", false)
    .gte("date_tentative", depuis);

  return (count ?? 0) >= MAX_TENTATIVES;
}

async function enregistrerTentative(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  reussi: boolean
) {
  await supabaseAdmin.from("login_attempts").insert({ identifiant, portail: "admin", reussi });
}

/**
 * §5.1 GSR_ARCHITECTURE.md — l'écran /admin/login ne demande que
 * username + mot de passe. Supabase Auth ne connaît que l'email : on résout
 * d'abord l'email associé via le client service role (RLS interdit toute
 * lecture non authentifiée sur `users`), puis on authentifie normalement.
 */
export async function login(username: string, password: string): Promise<{ error?: string }> {
  const supabaseAdmin = createServiceRoleClient();

  if (await tropDeTentatives(supabaseAdmin, username)) {
    return { error: "Trop de tentatives, réessayez dans 15 minutes." };
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("email, actif")
    .eq("username", username)
    .single();

  if (!profile || !profile.actif) {
    await enregistrerTentative(supabaseAdmin, username, false);
    return { error: "Identifiants invalides" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  await enregistrerTentative(supabaseAdmin, username, !error);

  if (error) {
    return { error: "Identifiants invalides" };
  }

  return {};
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
