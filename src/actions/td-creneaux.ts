"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(await createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidatePlanning() {
  revalidatePath("/td/coord/planning");
}

export interface CreerCreneauInput {
  semaineId: number;
  classeId: number;
  matiereId: number;
  dateTd: string; // ISO yyyy-mm-dd
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  montantPrevu: number;
}

function estErreurContrainteUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

/**
 * §10.3 — la date doit tomber dans la semaine choisie (contrôlé côté
 * serveur, en plus du `min`/`max` du date picker qui ne bloque pas un
 * `input` tapé/collé à la main). Violation de la contrainte UNIQUE
 * (Règle B, §12.7) interceptée pour un message lisible.
 */
export async function creerCreneauTD(input: CreerCreneauInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  if (input.heureFin <= input.heureDebut) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: semaine } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("statut, date_debut, date_fin")
    .eq("id", input.semaineId)
    .single();
  if (!semaine || semaine.statut !== "brouillon") {
    return { error: "Les créneaux ne peuvent être créés que sur une semaine en brouillon." };
  }
  if (input.dateTd < semaine.date_debut || input.dateTd > semaine.date_fin) {
    return { error: "La date du créneau doit être comprise dans la semaine sélectionnée." };
  }

  const { error } = await supabaseAdmin.schema("td").from("creneaux").insert({
    semaine_id: input.semaineId,
    classe_id: input.classeId,
    matiere_id: input.matiereId,
    date_td: input.dateTd,
    heure_debut: input.heureDebut,
    heure_fin: input.heureFin,
    montant_prevu: input.montantPrevu,
  });

  if (error) {
    if (estErreurContrainteUnique(error)) {
      return { error: "Un créneau existe déjà pour cette classe à cette date et cette heure." };
    }
    return { error: error.message };
  }

  revalidatePlanning();
  return {};
}

/** §12.8 — modification des créneaux uniquement en brouillon ; la suppression suit la même règle. */
export async function supprimerCreneauTD(creneauId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: creneau } = await supabaseAdmin.schema("td").from("creneaux").select("statut_creneau").eq("id", creneauId).single();
  if (!creneau || creneau.statut_creneau !== "brouillon") {
    return { error: "Seul un créneau encore en brouillon peut être supprimé." };
  }

  const { error } = await supabaseAdmin.schema("td").from("creneaux").delete().eq("id", creneauId);
  if (error) return { error: error.message };

  revalidatePlanning();
  return {};
}
