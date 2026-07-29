"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidatePlanning() {
  revalidatePath("/td/coord/planning");
}

const JOURS_AUTORISES = [0, 3, 6]; // dimanche, mercredi, samedi

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

/** §10.3/§12.7 (Règle B) — jour contrôlé côté serveur en plus du filtre JS du date picker ; violation UNIQUE interceptée pour un message lisible. */
export async function creerCreneauTD(input: CreerCreneauInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  const jour = new Date(`${input.dateTd}T00:00:00`).getDay();
  if (!JOURS_AUTORISES.includes(jour)) {
    return { error: "Un créneau TD ne peut avoir lieu qu'un mercredi, samedi ou dimanche." };
  }
  if (input.heureFin <= input.heureDebut) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: semaine } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("statut")
    .eq("id", input.semaineId)
    .single();
  if (!semaine || semaine.statut !== "brouillon") {
    return { error: "Les créneaux ne peuvent être créés que sur une semaine en brouillon." };
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
