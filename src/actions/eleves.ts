"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope } from "@/lib/auth-scope";
import { genererMatricule } from "@/lib/matricule";
import { estVenuDansLeMois, PENALITE_REINSCRIPTION_MONTANT } from "@/lib/reinscription";
import type { MoisScolaire, ModePaiement } from "@/lib/constants";

const ROLES_GESTION_ELEVES = ["coordonnateur", "comptable", "superviseur"] as const;

export interface InscrireEleveInput {
  nom: string;
  prenoms: string;
  contactParent: string;
  classeId: number;
  college: string;
  optionM?: string | null;
}

async function getScopeAndAssert() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!ROLES_GESTION_ELEVES.includes(scope.role as (typeof ROLES_GESTION_ELEVES)[number])) {
    throw new Error("Non autorisé");
  }
  return scope;
}

/** §8.3 GSR_ARCHITECTURE.md — détection de doublons + génération matricule. */
export async function inscrireEleve(
  input: InscrireEleveInput,
  options: { force?: boolean } = {}
): Promise<{ error?: string; requiresConfirmation?: boolean; matricule?: string }> {
  const scope = await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: classe } = await supabaseAdmin
    .from("classes")
    .select("id, site_id, sites(initiale)")
    .eq("id", input.classeId)
    .single();

  if (!classe) return { error: "Classe introuvable" };
  if (!siteInScope(scope, classe.site_id)) return { error: "Non autorisé sur ce site" };

  const nom = input.nom.toUpperCase().trim();
  const college = input.college.toUpperCase().trim();
  const prenoms = input.prenoms.trim();

  if (!options.force) {
    const { count } = await supabaseAdmin
      .from("eleves")
      .select("*", { count: "exact", head: true })
      .eq("nom", nom)
      .eq("college", college)
      .ilike("prenoms", prenoms);

    if ((count ?? 0) > 0) {
      return {
        requiresConfirmation: true,
        error: "Un élève avec un nom, prénoms et collège similaires existe déjà. Confirmer l'inscription ?",
      };
    }
  }

  const initiale = (classe as unknown as { sites: { initiale: string } }).sites.initiale;
  const matricule = await genererMatricule(supabaseAdmin, initiale);

  const { error } = await supabaseAdmin.from("eleves").insert({
    matricule,
    nom,
    prenoms,
    contact_parent: input.contactParent,
    classe_id: input.classeId,
    college,
    option_m: input.optionM || null,
    statut: "actif",
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/eleves/liste");
  return { matricule };
}

export interface ModifierEleveInput {
  id: number;
  nom: string;
  prenoms: string;
  contactParent: string;
  classeId: number;
  college: string;
  optionM?: string | null;
}

export async function modifierEleve(input: ModifierEleveInput): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, classes(site_id)")
    .eq("id", input.id)
    .single();

  if (!eleve) return { error: "Élève introuvable" };
  const currentSiteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, currentSiteId)) return { error: "Non autorisé" };

  const { data: nouvelleClasse } = await supabaseAdmin
    .from("classes")
    .select("site_id")
    .eq("id", input.classeId)
    .single();

  if (!nouvelleClasse || !siteInScope(scope, nouvelleClasse.site_id)) {
    return { error: "Non autorisé sur la classe cible" };
  }

  const { error } = await supabaseAdmin
    .from("eleves")
    .update({
      nom: input.nom.toUpperCase().trim(),
      prenoms: input.prenoms.trim(),
      contact_parent: input.contactParent,
      classe_id: input.classeId,
      college: input.college.toUpperCase().trim(),
      option_m: input.optionM || null,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/eleves/liste");
  return {};
}

const RAISONS_MANUELLES = ["maladie", "renvoi", "autre"] as const;

/**
 * §12.2 GSR_ARCHITECTURE.md v2.1 — ne supprime JAMAIS la ligne `eleves`.
 * UPDATE statut -> INSERT eleves_suspendus -> INSERT notifications.
 */
export async function suspendreEleve(
  eleveId: number,
  raison: (typeof RAISONS_MANUELLES)[number],
  motif: string
): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  if (!RAISONS_MANUELLES.includes(raison)) {
    return { error: "Raison invalide pour une suspension manuelle" };
  }

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classes(site_id)")
    .eq("id", eleveId)
    .single();

  if (!eleve || eleve.statut !== "actif") return { error: "Élève introuvable ou déjà suspendu" };
  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) return { error: "Non autorisé" };

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  const { error: updateError } = await supabaseAdmin
    .from("eleves")
    .update({ statut: "suspendu" })
    .eq("id", eleveId);
  if (updateError) return { error: updateError.message };

  const { error: insertError } = await supabaseAdmin.from("eleves_suspendus").insert({
    eleve_id: eleveId,
    site_id: siteId,
    raison,
    motif,
    montant_du: 0,
    suspendu_par: scope.userId,
    annee_scolaire_id: anneeEnCours.id,
  });
  if (insertError) return { error: insertError.message };

  await supabaseAdmin.from("notifications").insert({
    site_id: siteId,
    contenu: `Élève suspendu (${raison}) — motif : ${motif}`,
  });

  revalidatePath("/admin/eleves/liste");
  revalidatePath("/admin/eleves/suspendus");
  return {};
}

export interface ReinscrireInput {
  modePaiement: ModePaiement;
  datePaiement: string; // YYYY-MM-DD
}

export interface ReinscrireResultat {
  error?: string;
  montantDuPaye?: number;
  moisExonere?: MoisScolaire | null;
  penalite?: number;
}

/**
 * §8.4 v2.1 + règle métier 2026-08-06 (pénalité de réinscription) — flux
 * transactionnel : encaisse la pénalité forfaitaire (toute raison), et pour
 * une suspension `defaut_paiement` avec montant dû, détermine via
 * `presences` si l'élève a fréquenté le mois suspendu — Cas B (venu quand
 * même) : montant dû payé et rattaché au bon `mois_souscription` dans
 * `paiements` ; Cas C (absent tout le mois) : montant dû exonéré, tracé
 * dans `mois_exoneres` plutôt que simulé comme payé. Puis seulement
 * UPDATE statut='actif' + suppression de la ligne eleves_suspendus.
 */
export async function reinscrireEleve(eleveId: number, input: ReinscrireInput): Promise<ReinscrireResultat> {
  const scope = await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classes(site_id)")
    .eq("id", eleveId)
    .single();

  if (!eleve || eleve.statut !== "suspendu") return { error: "Élève introuvable ou non suspendu" };
  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) return { error: "Non autorisé" };

  const { data: suspension } = await supabaseAdmin
    .from("eleves_suspendus")
    .select("raison, montant_du, mois_souscription, annee_scolaire_id")
    .eq("eleve_id", eleveId)
    .single();

  if (!suspension) return { error: "Suspension introuvable" };

  let moisExonere: MoisScolaire | null = null;

  if (suspension.raison === "defaut_paiement" && suspension.montant_du > 0 && suspension.mois_souscription) {
    const mois = suspension.mois_souscription as MoisScolaire;

    const { data: anneeScolaire } = await supabaseAdmin
      .from("annees_scolaires")
      .select("date_debut")
      .eq("id", suspension.annee_scolaire_id)
      .single();

    const estVenu = anneeScolaire ? await estVenuDansLeMois(supabaseAdmin, eleveId, mois, anneeScolaire.date_debut) : false;

    if (estVenu) {
      const { error: paiementError } = await supabaseAdmin.from("paiements").insert({
        eleve_id: eleveId,
        mois_souscription: mois,
        montant_paye: suspension.montant_du,
        date_paiement: input.datePaiement,
        mode_paiement: input.modePaiement,
        annee_scolaire_id: suspension.annee_scolaire_id,
      });
      if (paiementError) return { error: paiementError.message };
    } else {
      moisExonere = mois;
      const { error: exonereError } = await supabaseAdmin.from("mois_exoneres").insert({
        eleve_id: eleveId,
        mois_souscription: mois,
        annee_scolaire_id: suspension.annee_scolaire_id,
        exonere_par: scope.userId,
      });
      if (exonereError) return { error: exonereError.message };
    }
  }

  const { error: penaliteError } = await supabaseAdmin.from("penalites_reinscription").insert({
    eleve_id: eleveId,
    montant: PENALITE_REINSCRIPTION_MONTANT,
    mode_paiement: input.modePaiement,
    date_paiement: input.datePaiement,
    enregistre_par: scope.userId,
    annee_scolaire_id: suspension.annee_scolaire_id,
  });
  if (penaliteError) return { error: penaliteError.message };

  const { error: updateError } = await supabaseAdmin
    .from("eleves")
    .update({ statut: "actif" })
    .eq("id", eleveId);
  if (updateError) return { error: updateError.message };

  const { error: deleteError } = await supabaseAdmin
    .from("eleves_suspendus")
    .delete()
    .eq("eleve_id", eleveId);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/admin/eleves/liste");
  revalidatePath("/admin/eleves/suspendus");
  revalidatePath(`/admin/eleves/${eleveId}`);
  revalidatePath("/admin/paiements/historique");
  revalidatePath("/admin/paiements/en-retard");
  revalidatePath("/admin/comptabilite");
  revalidatePath("/admin/tableau-de-bord");

  return {
    montantDuPaye: moisExonere ? 0 : suspension.montant_du,
    moisExonere,
    penalite: PENALITE_REINSCRIPTION_MONTANT,
  };
}
