"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateDonneesScolairesPath() {
  revalidatePath("/admin/parametres/donnees-scolaires");
}

/** §12.11 GSR_ARCHITECTURE.md — trg_frais_td_lock_period lève ce message exact. */
function estErreurVerrouTarif(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { message?: unknown }).message === "string" &&
    (error as { message: string }).message.includes("Modification du montant interdite")
  );
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------

export interface CreerSiteInput {
  nomSite: string;
  initiale: string;
}

export async function creerSite(input: CreerSiteInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin
    .from("sites")
    .insert({ nom_site: input.nomSite, initiale: input.initiale.toUpperCase() });
  if (error) return { error: error.message };

  revalidateDonneesScolairesPath();
  return {};
}

export interface ModifierSiteInput {
  id: number;
  nomSite: string;
  initiale: string;
}

export async function modifierSite(input: ModifierSiteInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin
    .from("sites")
    .update({ nom_site: input.nomSite, initiale: input.initiale.toUpperCase() })
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidateDonneesScolairesPath();
  return {};
}

/**
 * `classes.site_id` est en `ON DELETE CASCADE` (une suppression de site
 * effacerait silencieusement ses classes puis, en cascade, leurs élèves) —
 * donc contrôle explicite ici, pas de filet de sécurité côté Postgres.
 */
export async function supprimerSite(id: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { count } = await supabaseAdmin
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("site_id", id);
  if ((count ?? 0) > 0) {
    return { error: "Ce site a des classes rattachées — supprimez-les d'abord." };
  }

  const { error } = await supabaseAdmin.from("sites").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateDonneesScolairesPath();
  return {};
}

// ---------------------------------------------------------------------------
// Classes (+ frais_td, 1:1 avec classe_id)
// ---------------------------------------------------------------------------

export interface CreerClasseInput {
  nomClasse: string;
  siteId: number;
  ordre: number;
  classeSuivanteId: number | null;
  tarifTd: number;
}

export async function creerClasse(input: CreerClasseInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: classe, error } = await supabaseAdmin
    .from("classes")
    .insert({
      nom_classe: input.nomClasse,
      site_id: input.siteId,
      ordre: input.ordre,
      classe_suivante_id: input.classeSuivanteId,
    })
    .select("id")
    .single();
  if (error || !classe) return { error: error?.message ?? "Échec de création de la classe" };

  // Le verrou de période (§12.11) ne porte que sur l'UPDATE de montant, jamais
  // sur l'INSERT — une nouvelle classe peut toujours recevoir son tarif initial.
  const { error: fraisError } = await supabaseAdmin
    .from("frais_td")
    .insert({ classe_id: classe.id, montant: input.tarifTd });
  if (fraisError) {
    await supabaseAdmin.from("classes").delete().eq("id", classe.id);
    return { error: fraisError.message };
  }

  revalidateDonneesScolairesPath();
  return {};
}

export interface ModifierClasseInput {
  id: number;
  nomClasse: string;
  ordre: number;
  classeSuivanteId: number | null;
  tarifTd: number;
}

export async function modifierClasse(input: ModifierClasseInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin
    .from("classes")
    .update({
      nom_classe: input.nomClasse,
      ordre: input.ordre,
      classe_suivante_id: input.classeSuivanteId,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  // N'émet l'UPDATE sur `montant` que si la valeur change réellement — le
  // trigger `trg_frais_td_lock_period` se déclenche dès que la colonne est
  // ciblée par un SET, même sans changement de valeur (§12.11).
  const { data: frais } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", input.id)
    .maybeSingle();

  if (frais && Number(frais.montant) !== input.tarifTd) {
    const { error: fraisError } = await supabaseAdmin
      .from("frais_td")
      .update({ montant: input.tarifTd })
      .eq("classe_id", input.id);
    if (fraisError) {
      if (estErreurVerrouTarif(fraisError)) {
        return { error: "Tarif verrouillé pendant l'année scolaire en cours — modifiable uniquement en période de vacances." };
      }
      return { error: fraisError.message };
    }
  }

  revalidateDonneesScolairesPath();
  return {};
}

/**
 * `eleves.classe_id` est en `ON DELETE CASCADE` — même raisonnement que
 * `supprimerSite()`, contrôle explicite avant suppression.
 */
export async function supprimerClasse(id: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { count } = await supabaseAdmin
    .from("eleves")
    .select("id", { count: "exact", head: true })
    .eq("classe_id", id);
  if ((count ?? 0) > 0) {
    return { error: "Cette classe a des élèves rattachés — impossible de la supprimer." };
  }

  const { error } = await supabaseAdmin.from("classes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateDonneesScolairesPath();
  return {};
}
