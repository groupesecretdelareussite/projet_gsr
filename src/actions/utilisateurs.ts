"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";
import type { UserRole } from "@/lib/constants";

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateUtilisateursPath() {
  revalidatePath("/admin/parametres/utilisateurs");
}

/** Postgres 23503 = violation de contrainte de clé étrangère (ON DELETE RESTRICT). */
function estErreurCleEtrangere(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23503";
}

export interface CreerUtilisateurInput {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  siteId?: number | null; // chef_site
  siteIds?: number[]; // superviseur
}

/** §5.1/§8.9 GSR_ARCHITECTURE.md — même séquence que scripts/seed-admin.ts, avec rollback du compte Auth si l'INSERT échoue. */
export async function creerUtilisateur(input: CreerUtilisateurInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return { error: authError?.message ?? "Échec de création du compte" };
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: authUser.user.id,
    username: input.username,
    email: input.email,
    role: input.role,
    site_id: input.role === "chef_site" ? input.siteId ?? null : null,
    actif: true,
  });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return { error: insertError.message };
  }

  if (input.role === "superviseur" && input.siteIds && input.siteIds.length > 0) {
    // §8.9 — assigner_sites_superviseur() se base sur auth.uid() : appel via le client RLS, pas service role.
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("assigner_sites_superviseur", {
      p_user_id: authUser.user.id,
      p_site_ids: input.siteIds,
    });
    if (rpcError) return { error: rpcError.message };
  }

  revalidateUtilisateursPath();
  return {};
}

export interface ModifierUtilisateurInput {
  id: string;
  username: string;
  role: UserRole;
  siteId?: number | null;
  siteIds?: number[];
}

/**
 * Gère les effets de bord d'un changement de rôle : `site_id` remis à NULL
 * hors de `chef_site` (trg_users_scope_coherence l'exige) ; `user_sites`
 * vidé hors de `superviseur` (interdit #20).
 */
export async function modifierUtilisateur(input: ModifierUtilisateurInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      username: input.username,
      role: input.role,
      site_id: input.role === "chef_site" ? input.siteId ?? null : null,
    })
    .eq("id", input.id);

  if (updateError) return { error: updateError.message };

  if (input.role === "superviseur") {
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("assigner_sites_superviseur", {
      p_user_id: input.id,
      p_site_ids: input.siteIds ?? [],
    });
    if (rpcError) return { error: rpcError.message };
  } else {
    const { error: deleteError } = await supabaseAdmin.from("user_sites").delete().eq("user_id", input.id);
    if (deleteError) return { error: deleteError.message };
  }

  revalidateUtilisateursPath();
  return {};
}

export async function reinitialiserMotDePasseUtilisateur(
  userId: string,
  nouveauMdp: string
): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: nouveauMdp });
  if (error) return { error: error.message };

  return {};
}

/** §5.1 — révoque immédiatement la session, sans attendre l'expiration naturelle du JWT. */
export async function desactiverUtilisateur(userId: string): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  if (userId === scope.userId) return { error: "Vous ne pouvez pas désactiver votre propre compte" };

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from("users").update({ actif: false }).eq("id", userId);
  if (error) return { error: error.message };

  await supabaseAdmin.auth.admin.signOut(userId, "global");

  revalidateUtilisateursPath();
  return {};
}

export async function reactiverUtilisateur(userId: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.from("users").update({ actif: true }).eq("id", userId);
  if (error) return { error: error.message };

  revalidateUtilisateursPath();
  return {};
}

export async function supprimerUtilisateur(userId: string): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  if (userId === scope.userId) return { error: "Vous ne pouvez pas supprimer votre propre compte" };

  const supabaseAdmin = createServiceRoleClient();
  const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", userId);

  if (deleteError) {
    if (estErreurCleEtrangere(deleteError)) {
      return { error: "Ce compte a un historique d'actions (paiements, suspensions…) — désactivez-le plutôt que de le supprimer." };
    }
    return { error: deleteError.message };
  }

  await supabaseAdmin.auth.admin.deleteUser(userId);

  revalidateUtilisateursPath();
  return {};
}
