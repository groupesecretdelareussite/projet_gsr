"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope } from "@/lib/auth-scope";
import { genererMatricule } from "@/lib/matricule";
import { estVenuDansLeMois, PENALITE_REINSCRIPTION_MONTANT } from "@/lib/reinscription";
import { normaliserNumero, validerNumeroTelephone } from "@/lib/telephone";
import { validerLigneImport, type LigneImportBrute } from "@/lib/import-eleves";
import type { MoisScolaire, ModePaiement } from "@/lib/constants";

const ROLES_GESTION_ELEVES = ["coordonnateur", "comptable", "superviseur"] as const;

export interface InscrireEleveInput {
  nom: string;
  prenoms: string;
  contactParent: string;
  contactParent2: string;
  classeId: number;
  college: string;
  optionM?: string | null;
}

/**
 * §discussion 2026-08-10 — contact_parent (WhatsApp) n'est plus obligatoire
 * seul : un parent peut ne pas avoir WhatsApp. Au moins un des deux contacts
 * doit être renseigné (garde-fou dupliqué en base, contrainte
 * eleves_au_moins_un_contact, sql/014). Retourne les valeurs normalisées
 * (sans espaces) prêtes à stocker, ou une erreur.
 */
function validerContacts(
  contactParentBrut: string,
  contactParent2Brut: string
): { contactParent: string | null; contactParent2: string | null; error?: string } {
  const contactParent = normaliserNumero(contactParentBrut);
  const contactParent2 = normaliserNumero(contactParent2Brut);

  if (!contactParent && !contactParent2) {
    return { contactParent: null, contactParent2: null, error: "Au moins un contact (WhatsApp ou téléphonique) doit être renseigné." };
  }
  if (contactParent) {
    const erreur = validerNumeroTelephone(contactParent);
    if (erreur) return { contactParent: null, contactParent2: null, error: erreur };
  }
  if (contactParent2) {
    const erreur = validerNumeroTelephone(contactParent2);
    if (erreur) return { contactParent: null, contactParent2: null, error: erreur };
  }

  return { contactParent: contactParent || null, contactParent2: contactParent2 || null };
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

  const { contactParent, contactParent2, error: erreurContacts } = validerContacts(input.contactParent, input.contactParent2);
  if (erreurContacts) return { error: erreurContacts };

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
    contact_parent: contactParent,
    contact_parent_2: contactParent2,
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
  contactParent2: string;
  classeId: number;
  college: string;
  optionM?: string | null;
}

export async function modifierEleve(input: ModifierEleveInput): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();

  const { contactParent, contactParent2, error: erreurContacts } = validerContacts(input.contactParent, input.contactParent2);
  if (erreurContacts) return { error: erreurContacts };

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
      contact_parent: contactParent,
      contact_parent_2: contactParent2,
      classe_id: input.classeId,
      college: input.college.toUpperCase().trim(),
      option_m: input.optionM || null,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/eleves/liste");
  return {};
}

const TAILLE_MAX_IMPORT = 5 * 1024 * 1024; // 5 Mo
const LIGNES_MAX_IMPORT = 2000;

export interface LigneIgnoree {
  ligne: number;
  nom: string;
  prenoms: string;
  raison: string;
}

export interface ImporterElevesResultat {
  error?: string;
  inseres?: number;
  ignores?: LigneIgnoree[];
}

function celluleTexte(valeur: unknown): string {
  return valeur === undefined || valeur === null ? "" : String(valeur).trim();
}

/**
 * Import en masse depuis le modèle Excel téléchargeable (ENTETES_MODELE_IMPORT,
 * import-eleves.ts) — inspiré de l'ancien import_eleves.php, adapté au schéma
 * actuel (deux contacts, format international, matricule généré). Traite les
 * lignes séquentiellement (pas en parallèle) : la génération du matricule et
 * la détection de doublon doivent voir l'état de la base au fur et à mesure,
 * y compris les lignes déjà insérées plus tôt dans le même fichier.
 */
export async function importerEleves(formData: FormData): Promise<ImporterElevesResultat> {
  const scope = await getScopeAndAssert();

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { error: "Fichier requis" };
  }
  if (fichier.size > TAILLE_MAX_IMPORT) {
    return { error: "Le fichier dépasse 5 Mo" };
  }
  if (!fichier.name.toLowerCase().endsWith(".xlsx")) {
    return { error: "Format non supporté — utilisez le modèle .xlsx fourni" };
  }

  let lignesBrutes: unknown[][];
  try {
    const classeur = XLSX.read(await fichier.arrayBuffer(), { type: "buffer" });
    const feuille = classeur.Sheets[classeur.SheetNames[0]];
    lignesBrutes = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1 });
  } catch {
    return { error: "Fichier illisible — utilisez le modèle .xlsx fourni" };
  }

  const lignesDonnees = lignesBrutes.slice(1); // ligne 1 = en-têtes
  if (lignesDonnees.length === 0) return { error: "Fichier vide" };
  if (lignesDonnees.length > LIGNES_MAX_IMPORT) {
    return { error: `Le fichier dépasse ${LIGNES_MAX_IMPORT} lignes` };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: classesData } = await supabaseAdmin
    .from("classes")
    .select("id, nom_classe, site_id, sites(nom_site, initiale)");

  const classeParCle = new Map<string, { id: number; site_id: number; initiale: string }>();
  for (const c of classesData ?? []) {
    const site = (c as unknown as { sites: { nom_site: string; initiale: string } }).sites;
    const cle = `${site.nom_site.trim().toUpperCase()}|${c.nom_classe.trim().toUpperCase()}`;
    classeParCle.set(cle, { id: c.id, site_id: c.site_id, initiale: site.initiale });
  }

  const ignores: LigneIgnoree[] = [];
  let inseres = 0;

  for (let i = 0; i < lignesDonnees.length; i++) {
    const numeroLigne = i + 2; // ligne 1 = en-têtes, donc la 1ère donnée est la ligne 2
    const cellules = lignesDonnees[i] ?? [];

    const brut: LigneImportBrute = {
      nom: celluleTexte(cellules[0]),
      prenoms: celluleTexte(cellules[1]),
      contactParent: celluleTexte(cellules[2]),
      contactParent2: celluleTexte(cellules[3]),
      college: celluleTexte(cellules[4]),
      site: celluleTexte(cellules[5]),
      classe: celluleTexte(cellules[6]),
      option: celluleTexte(cellules[7]),
    };

    if (!brut.nom && !brut.prenoms && !brut.site && !brut.classe) continue; // ligne vide

    const { valeurs, erreur } = validerLigneImport(brut);
    if (erreur || !valeurs) {
      ignores.push({ ligne: numeroLigne, nom: brut.nom, prenoms: brut.prenoms, raison: erreur ?? "Ligne invalide" });
      continue;
    }

    try {
      const cle = `${valeurs.site.toUpperCase()}|${valeurs.classe.toUpperCase()}`;
      const classeInfo = classeParCle.get(cle);
      if (!classeInfo) {
        ignores.push({ ligne: numeroLigne, nom: valeurs.nom, prenoms: valeurs.prenoms, raison: "Classe ou site introuvable" });
        continue;
      }
      if (!siteInScope(scope, classeInfo.site_id)) {
        ignores.push({ ligne: numeroLigne, nom: valeurs.nom, prenoms: valeurs.prenoms, raison: "Non autorisé sur ce site" });
        continue;
      }

      const { count } = await supabaseAdmin
        .from("eleves")
        .select("*", { count: "exact", head: true })
        .eq("nom", valeurs.nom)
        .eq("college", valeurs.college)
        .ilike("prenoms", valeurs.prenoms);
      if ((count ?? 0) > 0) {
        ignores.push({ ligne: numeroLigne, nom: valeurs.nom, prenoms: valeurs.prenoms, raison: "Doublon détecté" });
        continue;
      }

      const matricule = await genererMatricule(supabaseAdmin, classeInfo.initiale);

      const { error } = await supabaseAdmin.from("eleves").insert({
        matricule,
        nom: valeurs.nom,
        prenoms: valeurs.prenoms,
        contact_parent: valeurs.contactParent,
        contact_parent_2: valeurs.contactParent2,
        classe_id: classeInfo.id,
        college: valeurs.college,
        option_m: valeurs.optionM,
        statut: "actif",
      });

      if (error) {
        ignores.push({ ligne: numeroLigne, nom: valeurs.nom, prenoms: valeurs.prenoms, raison: "Erreur d'enregistrement" });
        continue;
      }

      inseres++;
    } catch {
      ignores.push({ ligne: numeroLigne, nom: valeurs.nom, prenoms: valeurs.prenoms, raison: "Erreur imprévue" });
    }
  }

  revalidatePath("/admin/eleves/liste");
  return { inseres, ignores };
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
        enregistre_par: scope.userId,
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
