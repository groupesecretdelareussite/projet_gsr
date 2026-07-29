"use server";

import { headers } from "next/headers";
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

/**
 * Changement de mot de passe en libre-service — n'importe quel rôle
 * connecté, pour son propre compte uniquement (§6, page
 * parametres/changer-mot-de-passe). L'ancien mot de passe est re-vérifié via
 * `signInWithPassword` avant `updateUser`, pour éviter qu'une session
 * laissée ouverte permette de changer le mot de passe sans le connaître.
 */
export async function changerMonMotDePasse(ancienMdp: string, nouveauMdp: string): Promise<{ error?: string }> {
  if (nouveauMdp.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non authentifié" };

  const { error: verifError } = await supabase.auth.signInWithPassword({ email: user.email, password: ancienMdp });
  if (verifError) return { error: "Mot de passe actuel incorrect" };

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) return { error: error.message };

  return {};
}

/**
 * Flux natif Supabase Auth « mot de passe oublié », demandé explicitement
 * pour le coordonnateur — mais s'applique techniquement à tout rôle admin,
 * tous partageant le même mécanisme Supabase Auth (§5.1). Ne révèle jamais
 * si l'email existe (même logique anti-énumération que le reste de
 * l'authentification) : toujours un succès générique côté appelant.
 */
export async function demanderReinitialisationMotDePasse(email: string): Promise<void> {
  const supabase = createClient();
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/admin/auth/confirm`,
  });
}

/**
 * Étape finale du flux ci-dessus : appelée depuis /admin/reinitialiser-mot-de-passe,
 * atteinte uniquement après que le Route Handler /admin/auth/confirm ait
 * échangé le code de récupération contre une vraie session Supabase Auth.
 */
export async function definirNouveauMotDePasse(nouveauMdp: string): Promise<{ error?: string }> {
  if (nouveauMdp.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session de réinitialisation expirée — recommencez la demande." };

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  return {};
}
