"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope, type UserScope } from "@/lib/auth-scope";
import type { ModePaiement, MoisScolaire, UserRole } from "@/lib/constants";

const ROLES_REGULARISATION = ["coordonnateur", "comptable", "superviseur"] as const;

export interface RegulariserSuspensionInput {
  eleveId: number;
  montantVerse: number;
  datePaiement: string; // YYYY-MM-DD
  modePaiement: ModePaiement;
}

export type CategorieRegularisation = "depassement" | "solde_complet" | "acompte_partiel";

export interface RegulariserSuspensionResult {
  error?: string;
  categorie?: CategorieRegularisation;
  nouveauStatut?: "actif" | "suspendu";
  nouveauResteDu?: number;
  montantPaye?: number;
  message?: string;
}

export interface EleveSuspenduDefautPaiement {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classeId: number;
  nomClasse: string;
  siteId: number;
  nomSite: string;
  moisSouscription: MoisScolaire;
  montantAttendu: number;
  dejaPaye: number;
  montantDuActuel: number;
  dateSuspension: string;
  motif: string;
}

async function getScopeAndAssert(roles: readonly UserRole[]): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!roles.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateToutesLesVues(eleveId: number) {
  revalidatePath("/admin/eleves/suspendus");
  revalidatePath("/admin/eleves/suspendus/regularisation");
  revalidatePath("/admin/eleves/liste");
  revalidatePath(`/admin/eleves/${eleveId}`);
  revalidatePath("/admin/paiements/historique");
  revalidatePath("/admin/paiements/a-jour");
  revalidatePath("/admin/paiements/en-retard");
  revalidatePath("/admin/comptabilite");
  revalidatePath("/admin/tableau-de-bord");
}

/**
 * Récupère la liste des élèves actuellement suspendus pour défaut de paiement
 * dans le périmètre géographique de l'utilisateur connecté, avec les montants
 * attendus et les montants déjà réglés.
 */
export async function getElevesSuspendusDefautPaiement(): Promise<{
  error?: string;
  data?: EleveSuspenduDefautPaiement[];
}> {
  try {
    const scope = await getScopeAndAssert(ROLES_REGULARISATION);
    const supabaseAdmin = createServiceRoleClient();

    // 1. Année scolaire en cours
    const { data: anneeEnCours } = await supabaseAdmin
      .from("annees_scolaires")
      .select("id")
      .eq("statut", "en_cours")
      .maybeSingle();

    if (!anneeEnCours) {
      return { data: [] };
    }

    // 2. Frais TD de toutes les classes
    const { data: fraisTdRows } = await supabaseAdmin
      .from("frais_td")
      .select("classe_id, montant");
    const montantFraisParClasse = new Map<number, number>(
      (fraisTdRows ?? []).map((f) => [f.classe_id as number, Number(f.montant)])
    );

    // 3. Élèves au statut 'suspendu' avec leurs suspensions
    const { data: elevesRows, error: elevesErr } = await supabaseAdmin
      .from("eleves")
      .select(
        "id, matricule, nom, prenoms, classe_id, classes!inner(nom_classe, site_id, sites(nom_site)), eleves_suspendus!inner(raison, motif, montant_du, mois_souscription, date_suspension, annee_scolaire_id)"
      )
      .eq("statut", "suspendu")
      .eq("eleves_suspendus.raison", "defaut_paiement")
      .order("nom");

    if (elevesErr) {
      return { error: elevesErr.message };
    }

    type RawEleveRow = {
      id: number;
      matricule: string;
      nom: string;
      prenoms: string;
      classe_id: number;
      classes: {
        nom_classe: string;
        site_id: number;
        sites: { nom_site: string } | null;
      };
      eleves_suspendus: Array<{
        raison: string;
        motif: string;
        montant_du: number;
        mois_souscription: string | null;
        date_suspension: string;
        annee_scolaire_id: number;
      }>;
    };

    const rawList = (elevesRows ?? []) as unknown as RawEleveRow[];

    // Filtrer par scope géographique (superviseur)
    const autorises = rawList.filter((e) => siteInScope(scope, e.classes.site_id));
    if (autorises.length === 0) {
      return { data: [] };
    }

    // 4. Récupérer les paiements déjà enregistrés pour ces élèves
    const eleveIds = autorises.map((e) => e.id);
    const { data: paiementsRows } = await supabaseAdmin
      .from("paiements")
      .select("eleve_id, mois_souscription, montant_paye")
      .in("eleve_id", eleveIds)
      .eq("annee_scolaire_id", anneeEnCours.id);

    const paiementsParCle = new Map<string, number>();
    for (const p of paiementsRows ?? []) {
      const cle = `${p.eleve_id}-${p.mois_souscription}`;
      paiementsParCle.set(cle, (paiementsParCle.get(cle) ?? 0) + Number(p.montant_paye));
    }

    const data: EleveSuspenduDefautPaiement[] = autorises.map((e) => {
      const susp = e.eleves_suspendus[0];
      const mois = (susp?.mois_souscription as MoisScolaire) ?? "Octobre";
      const cle = `${e.id}-${mois}`;
      const montantAttendu = montantFraisParClasse.get(e.classe_id) ?? Number(susp?.montant_du ?? 0);
      const dejaPaye = paiementsParCle.get(cle) ?? 0;

      return {
        id: e.id,
        matricule: e.matricule,
        nom: e.nom,
        prenoms: e.prenoms,
        classeId: e.classe_id,
        nomClasse: e.classes?.nom_classe ?? "—",
        siteId: e.classes?.site_id,
        nomSite: e.classes?.sites?.nom_site ?? "—",
        moisSouscription: mois,
        montantAttendu,
        dejaPaye,
        montantDuActuel: Number(susp?.montant_du ?? 0),
        dateSuspension: susp?.date_suspension ?? new Date().toISOString(),
        motif: susp?.motif ?? "Défaut de paiement",
      };
    });

    return { data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inattendue";
    return { error: message };
  }
}

/**
 * Server Action : Régularisation d'une suspension suite à un versement effectué
 * avant la coupure mais saisi avec décalage.
 *
 * Distingue strictement les 3 cas :
 * - Cas 1 : dejaPaye + montantVerse > montantAttendu -> Bloqué (dépassement interdit)
 * - Cas 2 : dejaPaye + montantVerse === montantAttendu -> Rétablissement immédiat (Catégorie 1)
 * - Cas 3 : dejaPaye + montantVerse < montantAttendu -> Maintien de suspension avec dette ajustée (Catégorie 2)
 */
export async function regulariserSuspension(
  input: RegulariserSuspensionInput
): Promise<RegulariserSuspensionResult> {
  const scope = await getScopeAndAssert(ROLES_REGULARISATION);

  if (!input.eleveId || isNaN(input.eleveId)) {
    return { error: "Identifiant élève manquant ou invalide" };
  }

  if (typeof input.montantVerse !== "number" || isNaN(input.montantVerse) || input.montantVerse <= 0) {
    return { error: "Veuillez saisir un montant versé strictement positif" };
  }

  if (!input.datePaiement || !/^\d{4}-\d{2}-\d{2}$/.test(input.datePaiement)) {
    return { error: "Date de paiement invalide (format attendu : AAAA-MM-JJ)" };
  }

  if (!["MoMo", "Presentiel"].includes(input.modePaiement)) {
    return { error: "Mode de paiement invalide" };
  }

  const supabaseAdmin = createServiceRoleClient();

  // 1. Récupération de l'élève et contrôle de statut
  const { data: eleve, error: eleveError } = await supabaseAdmin
    .from("eleves")
    .select("id, nom, prenoms, matricule, statut, classe_id, classes(site_id, nom_classe)")
    .eq("id", input.eleveId)
    .maybeSingle();

  if (eleveError || !eleve) {
    return { error: "Élève introuvable" };
  }

  if (eleve.statut !== "suspendu") {
    return { error: "Cet élève n'est pas suspendu. Aucun rattrapage de suspension requis." };
  }

  type ClassesJoin = {
    site_id: number;
    nom_classe: string;
  } | null;
  const classesData = eleve.classes as unknown as ClassesJoin;
  const siteId = classesData?.site_id;

  if (!siteId || !siteInScope(scope, siteId)) {
    return { error: "Non autorisé sur le site de cet élève" };
  }

  // 2. Récupération de la suspension
  const { data: suspension, error: suspError } = await supabaseAdmin
    .from("eleves_suspendus")
    .select("id, raison, motif, montant_du, mois_souscription, annee_scolaire_id")
    .eq("eleve_id", input.eleveId)
    .maybeSingle();

  if (suspError || !suspension) {
    return { error: "Dossier de suspension introuvable pour cet élève" };
  }

  if (suspension.raison !== "defaut_paiement") {
    return { error: "Cette action est réservée aux suspensions pour défaut de paiement" };
  }

  if (!suspension.mois_souscription) {
    return { error: "Mois scolaire manquant sur la suspension" };
  }

  const moisConcerne = suspension.mois_souscription as MoisScolaire;

  // 3. Récupération des frais TD de la classe
  const { data: fraisTd, error: fraisErr } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", eleve.classe_id)
    .maybeSingle();

  if (fraisErr || !fraisTd) {
    return { error: "Frais de scolarité non configurés pour la classe de cet élève" };
  }

  const montantAttendu = Number(fraisTd.montant);

  // 4. Somme des versements déjà enregistrés pour ce mois
  const { data: paiementsExistants } = await supabaseAdmin
    .from("paiements")
    .select("montant_paye")
    .eq("eleve_id", input.eleveId)
    .eq("mois_souscription", moisConcerne)
    .eq("annee_scolaire_id", suspension.annee_scolaire_id);

  const dejaPaye = (paiementsExistants ?? []).reduce((acc, p) => acc + Number(p.montant_paye), 0);
  const resteAvantVersement = Math.max(0, montantAttendu - dejaPaye);

  // ==========================================================================
  // CAS 1 : DÉPASSEMENT INTERDIT
  // ==========================================================================
  if (input.montantVerse > resteAvantVersement) {
    return {
      error: `Le montant versé (${input.montantVerse.toLocaleString("fr-FR")} F) dépasse le reste dû (${resteAvantVersement.toLocaleString("fr-FR")} F). Aucun dépassement n'est autorisé.`,
      categorie: "depassement",
    };
  }

  // ==========================================================================
  // TRANSACTION COMMUNE : ENREGISTREMENT DU PAIEMENT EN BASE
  // ==========================================================================
  const { error: paiementInsertError } = await supabaseAdmin.from("paiements").insert({
    eleve_id: input.eleveId,
    mois_souscription: moisConcerne,
    montant_paye: input.montantVerse,
    date_paiement: input.datePaiement,
    mode_paiement: input.modePaiement,
    annee_scolaire_id: suspension.annee_scolaire_id,
    enregistre_par: scope.userId,
  });

  if (paiementInsertError) {
    return { error: `Erreur lors de l'enregistrement du paiement : ${paiementInsertError.message}` };
  }

  const nouveauResteDu = Math.max(0, resteAvantVersement - input.montantVerse);

  // ==========================================================================
  // CAS 2 : SOLDE COMPLET À 100% -> RÉTABLISSEMENT IMMÉDIAT
  // ==========================================================================
  if (nouveauResteDu === 0) {
    // a) Suppression de la suspension
    const { error: deleteSuspError } = await supabaseAdmin
      .from("eleves_suspendus")
      .delete()
      .eq("eleve_id", input.eleveId);

    if (deleteSuspError) {
      return { error: `Erreur lors de la levée de suspension : ${deleteSuspError.message}` };
    }

    // b) Réactivation de l'élève
    const { error: updateEleveError } = await supabaseAdmin
      .from("eleves")
      .update({ statut: "actif" })
      .eq("id", input.eleveId);

    if (updateEleveError) {
      return { error: `Erreur lors de la réactivation de l'élève : ${updateEleveError.message}` };
    }

    // c) Notification administrative de rétablissement
    await supabaseAdmin.from("notifications").insert({
      site_id: siteId,
      contenu: `Régularisation : levée de la suspension pour ${eleve.nom} ${eleve.prenoms} (${eleve.matricule}) — scolarité de ${moisConcerne} soldée à 100 %.`,
      roles_cibles: ["coordonnateur", "comptable", "superviseur", "chef_site"],
    });

    revalidateToutesLesVues(input.eleveId);

    return {
      categorie: "solde_complet",
      nouveauStatut: "actif",
      nouveauResteDu: 0,
      montantPaye: input.montantVerse,
      message: `Mois de ${moisConcerne} soldé. L'élève ${eleve.nom} ${eleve.prenoms} a été rétabli avec le statut actif.`,
    };
  }

  // ==========================================================================
  // CAS 3 : ACOMPTE PARTIEL -> MAINTIEN DE LA SUSPENSION AVEC DETTE AJUSTÉE
  // ==========================================================================
  const nouveauMotif = `Defaut de paiement — ${nouveauResteDu} F restants pour le mois de ${moisConcerne}`;
  const { error: updateSuspError } = await supabaseAdmin
    .from("eleves_suspendus")
    .update({
      montant_du: nouveauResteDu,
      motif: nouveauMotif,
    })
    .eq("eleve_id", input.eleveId);

  if (updateSuspError) {
    return { error: `Erreur lors de la mise à jour de la dette : ${updateSuspError.message}` };
  }

  // Notification d'acompte
  await supabaseAdmin.from("notifications").insert({
    site_id: siteId,
    contenu: `Régularisation : acompte de ${input.montantVerse.toLocaleString("fr-FR")} F enregistré pour ${eleve.nom} ${eleve.prenoms} (${eleve.matricule}) — nouveau reste dû pour ${moisConcerne} : ${nouveauResteDu.toLocaleString("fr-FR")} F.`,
    roles_cibles: ["coordonnateur", "comptable", "superviseur", "chef_site"],
  });

  revalidateToutesLesVues(input.eleveId);

  return {
    categorie: "acompte_partiel",
    nouveauStatut: "suspendu",
    nouveauResteDu,
    montantPaye: input.montantVerse,
    message: `Acompte de ${input.montantVerse.toLocaleString("fr-FR")} F enregistré. Nouveau reste dû : ${nouveauResteDu.toLocaleString("fr-FR")} F.`,
  };
}
