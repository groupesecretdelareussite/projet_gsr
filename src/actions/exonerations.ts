"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope } from "@/lib/auth-scope";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

export interface AttribuerExonerationInput {
  eleveId: number;
  typeExoneration: "permanente" | "bourse";
  moisCouverts?: MoisScolaire[];
  motif: string;
}

export interface ExonerationEleveData {
  id: number;
  eleveId: number;
  anneeScolaireId: number;
  typeExoneration: "permanente" | "bourse";
  nombreMois: number;
  moisCouverts: MoisScolaire[];
  motif: string;
  createdAt: string;
}

async function assertCoordonnateur() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    throw new Error("Action réservée au coordonnateur uniquement.");
  }
  return scope;
}

/**
 * Attribue une exonération permanente ou une bourse à un élève pour l'année scolaire en cours.
 * Action réservée exclusivement au coordonnateur.
 * Synchronise atomiquement les mois couverts dans public.mois_exoneres.
 */
export async function attribuerExoneration(
  input: AttribuerExonerationInput
): Promise<{ error?: string }> {
  const scope = await assertCoordonnateur();
  const supabaseAdmin = createServiceRoleClient();

  if (!input.motif?.trim()) {
    return { error: "Le motif ou justificatif est obligatoire." };
  }

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classe_id, classes(site_id)")
    .eq("id", input.eleveId)
    .single();

  if (!eleve || eleve.statut !== "actif") {
    return { error: "Élève introuvable ou inactif." };
  }

  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) {
    return { error: "Non autorisé sur ce site." };
  }

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) {
    return { error: "Aucune année scolaire en cours." };
  }

  let moisSelectionnes: MoisScolaire[] = [];
  if (input.typeExoneration === "permanente") {
    moisSelectionnes = [...MOIS_SCOLAIRES];
  } else {
    moisSelectionnes = (input.moisCouverts ?? []).filter((m) => MOIS_SCOLAIRES.includes(m));
    if (moisSelectionnes.length === 0) {
      return { error: "Veuillez sélectionner au moins un mois pour la bourse." };
    }
  }

  const motifComplet =
    input.typeExoneration === "permanente"
      ? `Exonération permanente : ${input.motif.trim()}`
      : `Bourse (${moisSelectionnes.length} mois) : ${input.motif.trim()}`;

  // 1. Enregistrement dans public.eleves_exonerations (upsert)
  const { error: exoError } = await supabaseAdmin
    .from("eleves_exonerations")
    .upsert(
      {
        eleve_id: input.eleveId,
        annee_scolaire_id: anneeEnCours.id,
        type_exoneration: input.typeExoneration,
        nombre_mois: moisSelectionnes.length,
        mois_couverts: moisSelectionnes,
        motif: input.motif.trim(),
        accorde_par: scope.userId,
      },
      { onConflict: "eleve_id, annee_scolaire_id" }
    );

  if (exoError) {
    return { error: `Erreur lors de l'enregistrement de l'exonération : ${exoError.message}` };
  }

  // 2. Nettoyage préventif des anciennes entrées bourses/permanentes pour cet élève et cette année
  await supabaseAdmin
    .from("mois_exoneres")
    .delete()
    .eq("eleve_id", input.eleveId)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .or("motif.ilike.Exonération permanente%,motif.ilike.Bourse%");

  // 3. Insertion des mois couverts dans public.mois_exoneres
  const lignesMois = moisSelectionnes.map((m) => ({
    eleve_id: input.eleveId,
    mois_souscription: m,
    annee_scolaire_id: anneeEnCours.id,
    motif: motifComplet,
    exonere_par: scope.userId,
  }));

  const { error: moisError } = await supabaseAdmin
    .from("mois_exoneres")
    .upsert(lignesMois, { onConflict: "eleve_id, mois_souscription, annee_scolaire_id" });

  if (moisError) {
    return { error: `Erreur lors de la synchronisation des mois : ${moisError.message}` };
  }

  revalidatePath(`/admin/eleves/${input.eleveId}`);
  revalidatePath("/admin/eleves/liste");
  revalidatePath("/admin/paiements/en-retard");
  revalidatePath("/admin/paiements/exonerations");
  revalidatePath("/admin/tableau-de-bord");

  return {};
}

/**
 * Révoque l'exonération ou bourse d'un élève pour l'année scolaire en cours.
 * Action réservée exclusivement au coordonnateur.
 */
export async function revoquerExoneration(eleveId: number): Promise<{ error?: string }> {
  await assertCoordonnateur();
  const supabaseAdmin = createServiceRoleClient();

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) {
    return { error: "Aucune année scolaire en cours." };
  }

  const { error: deleteExoError } = await supabaseAdmin
    .from("eleves_exonerations")
    .delete()
    .eq("eleve_id", eleveId)
    .eq("annee_scolaire_id", anneeEnCours.id);

  if (deleteExoError) {
    return { error: deleteExoError.message };
  }

  // Nettoyer uniquement les mois issus d'une bourse ou d'une exonération permanente
  await supabaseAdmin
    .from("mois_exoneres")
    .delete()
    .eq("eleve_id", eleveId)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .or("motif.ilike.Exonération permanente%,motif.ilike.Bourse%");

  revalidatePath(`/admin/eleves/${eleveId}`);
  revalidatePath("/admin/eleves/liste");
  revalidatePath("/admin/paiements/en-retard");
  revalidatePath("/admin/paiements/exonerations");
  revalidatePath("/admin/tableau-de-bord");

  return {};
}

/**
 * Récupère l'exonération active d'un élève pour l'année scolaire en cours.
 */
export async function obtenirExonerationEleve(
  eleveId: number
): Promise<{ data?: ExonerationEleveData | null; error?: string }> {
  const supabaseAdmin = createServiceRoleClient();

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) {
    return { data: null };
  }

  const { data, error } = await supabaseAdmin
    .from("eleves_exonerations")
    .select("id, eleve_id, annee_scolaire_id, type_exoneration, nombre_mois, mois_couverts, motif, created_at")
    .eq("eleve_id", eleveId)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) return { data: null };

  return {
    data: {
      id: data.id,
      eleveId: data.eleve_id,
      anneeScolaireId: data.annee_scolaire_id,
      typeExoneration: data.type_exoneration as "permanente" | "bourse",
      nombreMois: data.nombre_mois,
      moisCouverts: data.mois_couverts as MoisScolaire[],
      motif: data.motif,
      createdAt: data.created_at,
    },
  };
}
