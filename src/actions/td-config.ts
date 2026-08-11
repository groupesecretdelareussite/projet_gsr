"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

/**
 * §10.6 GSR_ARCHITECTURE.md — configuration TD réservée au coordonnateur.
 * Même convention que donnees-scolaires.ts/utilisateurs.ts : service role
 * pour toutes les lectures/écritures après ce contrôle (pas de policy "for
 * all" côté RLS, cf. sql/009_td_module.sql).
 */
async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(await createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateConfigPath(onglet: string) {
  revalidatePath(`/td/coord/config/${onglet}`);
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export async function creerZoneTD(nomZone: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.schema("td").from("zones").insert({ nom_zone: nomZone });
  if (error) return { error: error.message };

  revalidateConfigPath("zones");
  return {};
}

export async function modifierZoneTD(id: number, nomZone: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.schema("td").from("zones").update({ nom_zone: nomZone }).eq("id", id);
  if (error) return { error: error.message };

  revalidateConfigPath("zones");
  return {};
}

/** `td.professeurs.zone_id` est en ON DELETE RESTRICT — contrôle explicite pour un message lisible plutôt que l'erreur Postgres brute. */
export async function supprimerZoneTD(id: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { count } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id", { count: "exact", head: true })
    .eq("zone_id", id);
  if ((count ?? 0) > 0) {
    return { error: "Cette zone a des professeurs rattachés — impossible de la supprimer." };
  }

  const { error } = await supabaseAdmin.schema("td").from("zones").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateConfigPath("zones");
  return {};
}

// ---------------------------------------------------------------------------
// Matières TD
// ---------------------------------------------------------------------------

export async function creerMatiereTD(nomMatiere: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.schema("td").from("matieres_td").insert({ nom_matiere: nomMatiere });
  if (error) return { error: error.message };

  revalidateConfigPath("matieres");
  return {};
}

export async function modifierMatiereTD(id: number, nomMatiere: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.schema("td").from("matieres_td").update({ nom_matiere: nomMatiere }).eq("id", id);
  if (error) return { error: error.message };

  revalidateConfigPath("matieres");
  return {};
}

export async function supprimerMatiereTD(id: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { count } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("id", { count: "exact", head: true })
    .eq("matiere_id", id);
  if ((count ?? 0) > 0) {
    return { error: "Cette matière a des créneaux rattachés — impossible de la supprimer." };
  }

  const { error } = await supabaseAdmin.schema("td").from("matieres_td").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateConfigPath("matieres");
  return {};
}

// ---------------------------------------------------------------------------
// Professeurs — jamais de suppression, seulement désactivation (§4/§10.6)
// ---------------------------------------------------------------------------

export interface CreerProfesseurInput {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  motDePasse: string;
  zoneId: number;
  matierePrincipaleId: number;
}

export async function creerProfesseurTD(input: CreerProfesseurInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  if (input.motDePasse.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  const supabaseAdmin = createServiceRoleClient();
  const hash = await bcrypt.hash(input.motDePasse, 10);

  const { error } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .insert({
      nom: input.nom,
      prenom: input.prenom,
      telephone: input.telephone,
      email: input.email,
      mot_de_passe: hash,
      zone_id: input.zoneId,
      matiere_principale_id: input.matierePrincipaleId,
    });
  if (error) return { error: error.message };

  revalidateConfigPath("professeurs");
  return {};
}

export interface ModifierProfesseurInput {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  zoneId: number;
  matierePrincipaleId: number;
}

export async function modifierProfesseurTD(input: ModifierProfesseurInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .update({
      nom: input.nom,
      prenom: input.prenom,
      telephone: input.telephone,
      email: input.email,
      zone_id: input.zoneId,
      matiere_principale_id: input.matierePrincipaleId,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidateConfigPath("professeurs");
  return {};
}

/** §5.7 — réinitialisation manuelle par le coordonnateur, les professeurs n'ayant pas de flux natif « mot de passe oublié » (§5.3). */
export async function reinitialiserMotDePasseProfTD(professeurId: number, nouveauMdp: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  if (nouveauMdp.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  const supabaseAdmin = createServiceRoleClient();
  const hash = await bcrypt.hash(nouveauMdp, 10);

  const { error } = await supabaseAdmin.schema("td").from("professeurs").update({ mot_de_passe: hash }).eq("id", professeurId);
  if (error) return { error: error.message };

  return {};
}

export async function desactiverProfesseurTD(professeurId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.schema("td").from("professeurs").update({ actif: false }).eq("id", professeurId);
  if (error) return { error: error.message };

  revalidateConfigPath("professeurs");
  return {};
}

export async function reactiverProfesseurTD(professeurId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.schema("td").from("professeurs").update({ actif: true }).eq("id", professeurId);
  if (error) return { error: error.message };

  revalidateConfigPath("professeurs");
  return {};
}
