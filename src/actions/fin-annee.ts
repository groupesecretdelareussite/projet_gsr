"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";
import { DECISIONS_PASSAGE, type DecisionPassage } from "@/lib/constants";

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateFinAnneePaths() {
  revalidatePath("/admin/fin-annee");
  revalidatePath("/admin/tableau-de-bord");
  revalidatePath("/admin/eleves/liste");
}

interface EleveActifClasse {
  id: number;
  classes: { classe_suivante_id: number | null } | null;
}

/**
 * §8.10/§12.9 GSR_ARCHITECTURE.md — démarre la revue de fin d'année : passe
 * l'année en_cours en en_pause, puis pré-remplit une décision "passe" par
 * défaut pour chaque élève actif dont la classe a une `classe_suivante_id`
 * (chaîne simple, aucune saisie requise). Les élèves dont la classe est un
 * point de décision (`classe_suivante_id = NULL`) n'ont volontairement AUCUNE
 * décision créée ici — v2.2, override utilisateur du 2026-07-28 : ce cas ne
 * doit jamais être résolu automatiquement en "sortant", un humain doit
 * choisir (voir sql/006_fin_annee_ajustements.sql).
 */
export async function demarrerRevueFinAnnee(): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .maybeSingle();
  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  const { error: updateError } = await supabaseAdmin
    .from("annees_scolaires")
    .update({ statut: "en_pause" })
    .eq("id", anneeEnCours.id);
  if (updateError) return { error: updateError.message };

  const { data: elevesData } = await supabaseAdmin
    .from("eleves")
    .select("id, classes(classe_suivante_id)")
    .eq("statut", "actif");
  const elevesActifs = (elevesData ?? []) as unknown as EleveActifClasse[];

  const decisionsParDefaut = elevesActifs
    .filter((e) => e.classes?.classe_suivante_id != null)
    .map((e) => ({
      eleve_id: e.id,
      decision: "passe" as const,
      nouvelle_classe_id: e.classes!.classe_suivante_id,
      annee_scolaire_id: anneeEnCours.id,
      decide_par: scope.userId,
    }));

  if (decisionsParDefaut.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("decisions_passage")
      .upsert(decisionsParDefaut, { onConflict: "eleve_id" });
    if (upsertError) return { error: upsertError.message };
  }

  revalidateFinAnneePaths();
  return {};
}

/** Annule une revue démarrée par erreur : vide les décisions et repasse l'année en_cours. */
export async function annulerRevueFinAnnee(): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: anneeEnPause } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_pause")
    .maybeSingle();
  if (!anneeEnPause) return { error: "Aucune revue de fin d'année en cours" };

  const { error: deleteError } = await supabaseAdmin.from("decisions_passage").delete().gt("id", 0);
  if (deleteError) return { error: deleteError.message };

  const { error: updateError } = await supabaseAdmin
    .from("annees_scolaires")
    .update({ statut: "en_cours" })
    .eq("id", anneeEnPause.id);
  if (updateError) return { error: updateError.message };

  revalidateFinAnneePaths();
  return {};
}

export interface EnregistrerDecisionInput {
  eleveId: number;
  decision: DecisionPassage;
  nouvelleClasseId?: number | null;
}

/** Enregistre (ou modifie) la décision de passage d'un élève pendant la revue. */
export async function enregistrerDecisionPassage(input: EnregistrerDecisionInput): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();

  if (!DECISIONS_PASSAGE.includes(input.decision)) {
    return { error: "Décision invalide" };
  }
  if (input.decision === "passe" && !input.nouvelleClasseId) {
    return { error: "Classe de destination requise" };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: anneeEnPause } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_pause")
    .maybeSingle();
  if (!anneeEnPause) return { error: "Aucune revue de fin d'année en cours" };

  const { error } = await supabaseAdmin.from("decisions_passage").upsert(
    {
      eleve_id: input.eleveId,
      decision: input.decision,
      nouvelle_classe_id: input.decision === "passe" ? input.nouvelleClasseId : null,
      annee_scolaire_id: anneeEnPause.id,
      decide_par: scope.userId,
    },
    { onConflict: "eleve_id" }
  );
  if (error) return { error: error.message };

  revalidateFinAnneePaths();
  return {};
}

export interface ValiderFinAnneeInput {
  libelle: string;
  dateDebut: string;
  dateFin: string;
}

/**
 * Validation finale — transaction atomique via la fonction SQL stockée
 * `valider_fin_annee()` (sql/003_triggers_functions.sql). Appelée avec le
 * client RLS (pas service role) : la fonction vérifie `auth.uid()` en
 * interne, qui ne résout qu'avec une session utilisateur réelle.
 */
export async function validerFinAnnee(input: ValiderFinAnneeInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  if (!input.libelle.trim()) return { error: "Libellé requis" };
  if (input.dateDebut >= input.dateFin) return { error: "La date de fin doit être après la date de début" };

  const supabaseAdmin = createServiceRoleClient();

  const { data: anneeEnPause } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_pause")
    .maybeSingle();
  if (!anneeEnPause) return { error: "Aucune revue de fin d'année en cours" };

  const { data: elevesActifsData } = await supabaseAdmin.from("eleves").select("id").eq("statut", "actif");
  const idsElevesActifs = (elevesActifsData ?? []).map((e) => e.id as number);

  const { data: decisionsData } = await supabaseAdmin.from("decisions_passage").select("eleve_id");
  const idsAvecDecision = new Set((decisionsData ?? []).map((d) => d.eleve_id as number));

  const enAttente = idsElevesActifs.filter((id) => !idsAvecDecision.has(id)).length;
  if (enAttente > 0) {
    return { error: `${enAttente} élève(s) sans décision de passage — la revue n'est pas terminée` };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("valider_fin_annee", {
    p_nouvelle_libelle: input.libelle.trim(),
    p_nouvelle_date_debut: input.dateDebut,
    p_nouvelle_date_fin: input.dateFin,
  });
  if (error) return { error: error.message };

  revalidateFinAnneePaths();
  return {};
}
