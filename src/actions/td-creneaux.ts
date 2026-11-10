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
  if (!semaine || (semaine.statut !== "brouillon" && semaine.statut !== "publiee")) {
    return { error: "Les créneaux ne peuvent être créés que sur une semaine en brouillon ou publiée." };
  }
  if (input.dateTd < semaine.date_debut || input.dateTd > semaine.date_fin) {
    return { error: "La date du créneau doit être comprise dans la semaine sélectionnée." };
  }

  // Vérification de chevauchement d'horaires pour une même classe à la même date
  const { data: creneauxExistants } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("id, heure_debut, heure_fin, matiere_id")
    .eq("classe_id", input.classeId)
    .eq("date_td", input.dateTd);

  const hDebut = input.heureDebut.slice(0, 5);
  const hFin = input.heureFin.slice(0, 5);

  const conflit = (creneauxExistants ?? []).find((c) => {
    const cHesDebut = c.heure_debut.slice(0, 5);
    const cHesFin = c.heure_fin.slice(0, 5);
    return hDebut < cHesFin && hFin > cHesDebut;
  });

  if (conflit) {
    let nomMatiere = "une autre matière";
    const { data: matData } = await supabaseAdmin
      .schema("td")
      .from("matieres_td")
      .select("nom_matiere")
      .eq("id", conflit.matiere_id)
      .maybeSingle();
    if (matData?.nom_matiere) {
      nomMatiere = matData.nom_matiere;
    }
    return {
      error: `Un cours de ${nomMatiere} est déjà programmé pour cette classe de ${conflit.heure_debut.slice(0, 5)} à ${conflit.heure_fin.slice(0, 5)} (chevauchement interdit).`,
    };
  }

  // Si la semaine est déjà publiée, le créneau est inséré directement en "public"
  // pour être visible immédiatement par les professeurs.
  const statutCreneau = semaine.statut === "publiee" ? "public" : "brouillon";

  const { error } = await supabaseAdmin.schema("td").from("creneaux").insert({
    semaine_id: input.semaineId,
    classe_id: input.classeId,
    matiere_id: input.matiereId,
    date_td: input.dateTd,
    heure_debut: input.heureDebut,
    heure_fin: input.heureFin,
    montant_prevu: input.montantPrevu,
    statut_creneau: statutCreneau,
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

export interface ModifierCreneauInput {
  creneauId: number;
  classeId: number;
  matiereId: number;
  dateTd: string; // ISO yyyy-mm-dd
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
  montantPrevu: number;
  forcerAnnulationCandidaturesSiConflit?: boolean;
}

export interface ModifierCreneauResult {
  error?: string;
  confirmationRequise?: boolean;
  messageConfirmation?: string;
  candidatsEnConflit?: string[];
}

/**
 * Modification d'un créneau TD (brouillon ou public).
 * Règle A : si des professeurs ont déjà postulé et que le nouvel horaire entre
 * en conflit avec un créneau validé ailleurs, une confirmation est requise.
 * En cas de confirmation, les candidatures en attente sont réinitialisées (supprimées)
 * pour leur permettre de re-postuler.
 * Règle B : si le créneau est clôturé (prof validé), la modification directe est bloquée
 * (obligation de libérer le créneau d'abord).
 */
export async function modifierCreneauTD(input: ModifierCreneauInput): Promise<ModifierCreneauResult> {
  await getScopeAndAssert();

  if (input.heureFin <= input.heureDebut) {
    return { error: "L'heure de fin doit être après l'heure de début." };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: creneau } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("id, semaine_id, classe_id, matiere_id, date_td, heure_debut, heure_fin, montant_prevu, statut_creneau")
    .eq("id", input.creneauId)
    .single();

  if (!creneau) {
    return { error: "Créneau introuvable." };
  }

  if (creneau.statut_creneau === "cloture") {
    return {
      error: "Ce créneau est déjà clôturé avec un professeur validé. Veuillez d'abord utiliser l'action « Libérer le créneau » pour le repasser en public avant de le modifier.",
    };
  }

  const { data: semaine } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .select("statut, date_debut, date_fin")
    .eq("id", creneau.semaine_id)
    .single();

  if (!semaine) {
    return { error: "Semaine associée introuvable." };
  }

  if (semaine.statut === "cloturee") {
    return { error: "Cette semaine est déjà clôturée, impossible de modifier ses créneaux." };
  }

  if (input.dateTd < semaine.date_debut || input.dateTd > semaine.date_fin) {
    return { error: "La date du créneau doit être comprise dans la semaine sélectionnée." };
  }

  // Vérification de chevauchement d'horaires pour une même classe à la même date
  const { data: creneauxClasseExistants } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("id, heure_debut, heure_fin, matiere_id")
    .eq("classe_id", input.classeId)
    .eq("date_td", input.dateTd)
    .neq("id", input.creneauId);

  const hDebut = input.heureDebut.slice(0, 5);
  const hFin = input.heureFin.slice(0, 5);

  const conflitClasse = (creneauxClasseExistants ?? []).find((c) => {
    const cHesDebut = c.heure_debut.slice(0, 5);
    const cHesFin = c.heure_fin.slice(0, 5);
    return hDebut < cHesFin && hFin > cHesDebut;
  });

  if (conflitClasse) {
    let nomMatiere = "une autre matière";
    const { data: matData } = await supabaseAdmin
      .schema("td")
      .from("matieres_td")
      .select("nom_matiere")
      .eq("id", conflitClasse.matiere_id)
      .maybeSingle();
    if (matData?.nom_matiere) {
      nomMatiere = matData.nom_matiere;
    }
    return {
      error: `Un cours de ${nomMatiere} est déjà programmé pour cette classe de ${conflitClasse.heure_debut.slice(0, 5)} à ${conflitClasse.heure_fin.slice(0, 5)} (chevauchement interdit).`,
    };
  }

  // Vérification des candidatures existantes en attente
  const { data: candidaturesEnAttente } = await supabaseAdmin
    .schema("td")
    .from("postulations")
    .select("id, professeur_id, professeurs(nom, prenom)")
    .eq("creneau_id", input.creneauId)
    .eq("statut_validation", "En attente");

  const candidats = candidaturesEnAttente ?? [];

  if (candidats.length > 0) {
    const idsProfs = candidats.map((c) => c.professeur_id);
    const { data: postulationsValideesAilleurs } = await supabaseAdmin
      .schema("td")
      .from("postulations")
      .select("professeur_id, creneau_id")
      .in("professeur_id", idsProfs)
      .eq("statut_validation", "Valide");

    const idsCreneauxAVerifier = [
      ...new Set((postulationsValideesAilleurs ?? []).map((p) => p.creneau_id).filter((id) => id !== input.creneauId)),
    ];
    const { data: creneauxValides } = idsCreneauxAVerifier.length
      ? await supabaseAdmin.schema("td").from("creneaux").select("id, date_td, heure_debut, heure_fin").in("id", idsCreneauxAVerifier)
      : { data: [] as { id: number; date_td: string; heure_debut: string; heure_fin: string }[] };

    const creneauValideParId = new Map((creneauxValides ?? []).map((c) => [c.id, c]));

    const profsEnConflitIds = new Set(
      (postulationsValideesAilleurs ?? [])
        .filter((p) => {
          const autre = creneauValideParId.get(p.creneau_id);
          return (
            autre &&
            chevauchent(autre, {
              date_td: input.dateTd,
              heure_debut: input.heureDebut,
              heure_fin: input.heureFin,
            })
          );
        })
        .map((p) => p.professeur_id)
    );

    if (profsEnConflitIds.size > 0) {
      const profsEnConflitNoms = candidats
        .filter((c) => profsEnConflitIds.has(c.professeur_id))
        .map((c) => {
          const p = c.professeurs as unknown as { nom: string; prenom: string } | null;
          return p ? `${p.prenom} ${p.nom}` : `Professeur #${c.professeur_id}`;
        });

      if (!input.forcerAnnulationCandidaturesSiConflit) {
        return {
          confirmationRequise: true,
          candidatsEnConflit: profsEnConflitNoms,
          messageConfirmation: `Ce nouvel horaire entre en conflit avec l'agenda validé de : ${profsEnConflitNoms.join(
            ", "
          )}. Souhaitez-vous quand même appliquer la modification ? Cela annulera les candidatures en attente pour leur permettre de re-postuler.`,
        };
      }

      // Confirmation accordée par le coordonnateur : purge des candidatures en attente pour libérer les professeurs
      const { error: errSuppressionPostulations } = await supabaseAdmin
        .schema("td")
        .from("postulations")
        .delete()
        .eq("creneau_id", input.creneauId)
        .eq("statut_validation", "En attente");

      if (errSuppressionPostulations) {
        return { error: errSuppressionPostulations.message };
      }
    }
  }

  const { error: updateError } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .update({
      classe_id: input.classeId,
      matiere_id: input.matiereId,
      date_td: input.dateTd,
      heure_debut: input.heureDebut,
      heure_fin: input.heureFin,
      montant_prevu: input.montantPrevu,
    })
    .eq("id", input.creneauId);

  if (updateError) {
    if (estErreurContrainteUnique(updateError)) {
      return { error: "Un créneau existe déjà pour cette classe à cette date et cette heure." };
    }
    return { error: updateError.message };
  }

  revalidatePlanning();
  revalidatePath("/td/coord/arbitrage");
  revalidatePath("/td/prof/candidatures");
  revalidatePath("/programmes");
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
