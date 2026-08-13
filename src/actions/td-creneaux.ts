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

function chevauchent(
  a: { date_td: string; heure_debut: string; heure_fin: string },
  b: { date_td: string; heure_debut: string; heure_fin: string }
): boolean {
  return a.date_td === b.date_td && a.heure_debut < b.heure_fin && a.heure_fin > b.heure_debut;
}

/**
 * Désistement d'un professeur validé (discussion 2026-08-12) — décision
 * exclusivement coordonnateur : le professeur prévient par téléphone/
 * WhatsApp, pas de self-service côté prof. Rouvre le créneau parmi les
 * candidats initiaux qui sont ENCORE réellement disponibles — certains ont pu
 * depuis être validés ailleurs sur un créneau qui chevauche celui-ci ; ceux-là
 * restent `Refuse` plutôt que d'être remis en jeu. `arbitrer_creneau()`
 * (sql/018) porte le même garde-fou de son côté, indépendamment de la
 * fraîcheur de cette liste.
 */
export async function libererCreneauTD(creneauId: number, motif: string): Promise<{ error?: string }> {
  await getScopeAndAssert();
  if (!motif.trim()) return { error: "Un motif est requis." };

  const supabaseAdmin = createServiceRoleClient();

  const { data: creneau } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("statut_creneau, semaine_id, date_td, heure_debut, heure_fin")
    .eq("id", creneauId)
    .single();
  if (!creneau || creneau.statut_creneau !== "cloture") {
    return { error: "Seul un créneau clôturé peut être libéré." };
  }

  const { data: semaine } = await supabaseAdmin.schema("td").from("semaines").select("statut").eq("id", creneau.semaine_id).single();
  if (!semaine || semaine.statut === "cloturee") {
    return { error: "Cette semaine est déjà clôturée, impossible de revenir sur ce créneau." };
  }

  const { data: postulationValidee } = await supabaseAdmin
    .schema("td")
    .from("postulations")
    .select("id")
    .eq("creneau_id", creneauId)
    .eq("statut_validation", "Valide")
    .maybeSingle();
  if (!postulationValidee) {
    return { error: "Ce créneau n'a pas de professeur validé à libérer." };
  }

  const { error: erreurRetrait } = await supabaseAdmin
    .schema("td")
    .from("postulations")
    .update({ statut_validation: "Retiree", motif_retrait: motif.trim() })
    .eq("id", postulationValidee.id);
  if (erreurRetrait) return { error: erreurRetrait.message };

  const { data: autresCandidats } = await supabaseAdmin
    .schema("td")
    .from("postulations")
    .select("id, professeur_id")
    .eq("creneau_id", creneauId)
    .eq("statut_validation", "Refuse");

  if (autresCandidats && autresCandidats.length > 0) {
    const idsProfsCandidats = autresCandidats.map((c) => c.professeur_id);

    const { data: postulationsValideesAilleurs } = await supabaseAdmin
      .schema("td")
      .from("postulations")
      .select("professeur_id, creneau_id")
      .in("professeur_id", idsProfsCandidats)
      .eq("statut_validation", "Valide");

    const idsCreneauxAVerifier = [...new Set((postulationsValideesAilleurs ?? []).map((p) => p.creneau_id))];
    const { data: creneauxAVerifier } = idsCreneauxAVerifier.length
      ? await supabaseAdmin.schema("td").from("creneaux").select("id, date_td, heure_debut, heure_fin").in("id", idsCreneauxAVerifier)
      : { data: [] as { id: number; date_td: string; heure_debut: string; heure_fin: string }[] };
    const creneauParId = new Map((creneauxAVerifier ?? []).map((c) => [c.id, c]));

    const idsProfsIndisponibles = new Set(
      (postulationsValideesAilleurs ?? [])
        .filter((p) => {
          const autreCreneau = creneauParId.get(p.creneau_id);
          return autreCreneau && chevauchent(autreCreneau, creneau);
        })
        .map((p) => p.professeur_id)
    );

    const idsARouvrir = autresCandidats.filter((c) => !idsProfsIndisponibles.has(c.professeur_id)).map((c) => c.id);
    if (idsARouvrir.length > 0) {
      const { error: erreurReouverture } = await supabaseAdmin
        .schema("td")
        .from("postulations")
        .update({ statut_validation: "En attente" })
        .in("id", idsARouvrir);
      if (erreurReouverture) return { error: erreurReouverture.message };
    }
  }

  const { error: erreurReouvertureCreneau } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .update({ statut_creneau: "public" })
    .eq("id", creneauId);
  if (erreurReouvertureCreneau) return { error: erreurReouvertureCreneau.message };

  revalidatePlanning();
  revalidatePath("/td/coord/arbitrage");
  return {};
}
