"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope, type UserScope } from "@/lib/auth-scope";
import { resteAPayer } from "@/lib/paiements";
import { MOIS_SCOLAIRES, type MoisScolaire, type ModePaiement, type UserRole } from "@/lib/constants";

const ROLES_PAIEMENTS = ["coordonnateur", "comptable", "superviseur"] as const;
const ROLES_SUPPRESSION = ["coordonnateur", "comptable"] as const;

function revalidatePaiementsPaths() {
  revalidatePath("/admin/paiements/historique");
  revalidatePath("/admin/paiements/a-jour");
  revalidatePath("/admin/paiements/en-retard");
  revalidatePath("/admin/paiements/supprimes");
  revalidatePath("/admin/tableau-de-bord");
}

async function getScopeAndAssert(roles: readonly UserRole[]): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!roles.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

export interface EnregistrerPaiementInput {
  eleveId: number;
  moisSouscription: MoisScolaire;
  montantPaye: number;
  datePaiement: string;
  modePaiement: ModePaiement;
}

export interface InfoResteAPayer {
  montantAttendu: number;
  dejaPaye: number;
  resteAPayer: number;
  estExonere?: boolean;
  motifExoneration?: string;
  versements: Array<{
    id: number;
    datePaiement: string;
    montantPaye: number;
    modePaiement: string;
  }>;
}

export interface EnregistrerPaiementResult {
  error?: string;
  resteApresPaiement?: number;
  montantAttendu?: number;
  college?: string;
  anneeLibelle?: string;
  lastPaiementId?: number;
  versements?: Array<{
    id: number;
    datePaiement: string;
    montantPaye: number;
    modePaiement: string;
  }>;
}

export interface EnregistrerPaiementMultiMoisInput {
  eleveId: number;
  moisPayes: MoisScolaire[];
  datePaiement: string;
  modePaiement: ModePaiement;
}

export interface EnregistrerPaiementMultiMoisResult {
  error?: string;
  moisPayes?: MoisScolaire[];
  montantTotalPaye?: number;
  moisOfferts?: MoisScolaire[];
  message?: string;
  college?: string;
  anneeLibelle?: string;
}

/** Consultation du reste à payer et des versements existants pour un élève et un mois. */
export async function consulterResteAPayer(
  eleveId: number,
  moisSouscription: MoisScolaire
): Promise<{ error?: string; data?: InfoResteAPayer }> {
  const scope = await getScopeAndAssert(ROLES_PAIEMENTS);
  const supabaseAdmin = createServiceRoleClient();

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classe_id, classes(site_id)")
    .eq("id", eleveId)
    .single();

  if (!eleve || eleve.statut !== "actif") return { error: "Élève introuvable ou suspendu" };
  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) return { error: "Non autorisé sur ce site" };

  const { data: fraisTd } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", eleve.classe_id)
    .single();

  if (!fraisTd) return { error: "Aucun montant de frais TD configuré pour cette classe" };

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  const montantAttendu = Number(fraisTd.montant);

  // Vérifier si ce mois est exonéré ou déjà offert
  const { data: exo } = await supabaseAdmin
    .from("mois_exoneres")
    .select("motif")
    .eq("eleve_id", eleveId)
    .eq("mois_souscription", moisSouscription)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .maybeSingle();

  if (exo) {
    return {
      data: {
        montantAttendu,
        dejaPaye: 0,
        resteAPayer: 0,
        estExonere: true,
        motifExoneration: exo.motif,
        versements: [],
      },
    };
  }

  const { data: paiements } = await supabaseAdmin
    .from("paiements")
    .select("id, montant_paye, date_paiement, mode_paiement")
    .eq("eleve_id", eleveId)
    .eq("mois_souscription", moisSouscription)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .order("date_paiement", { ascending: true })
    .order("id", { ascending: true });

  const dejaPaye = (paiements ?? []).reduce((sum, p) => sum + Number(p.montant_paye), 0);
  const reste = Math.max(0, montantAttendu - dejaPaye);

  return {
    data: {
      montantAttendu,
      dejaPaye,
      resteAPayer: reste,
      estExonere: false,
      versements: (paiements ?? []).map((p) => ({
        id: p.id,
        datePaiement: p.date_paiement,
        montantPaye: Number(p.montant_paye),
        modePaiement: p.mode_paiement,
      })),
    },
  };
}

/** §8.7/§12.5 GSR_ARCHITECTURE.md — le montant payé ne peut jamais dépasser le reste dû. */
export async function enregistrerPaiement(
  input: EnregistrerPaiementInput
): Promise<EnregistrerPaiementResult> {
  const scope = await getScopeAndAssert(ROLES_PAIEMENTS);
  const supabaseAdmin = createServiceRoleClient();

  if (input.montantPaye <= 0) return { error: "Montant invalide" };

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classe_id, college, classes(site_id)")
    .eq("id", input.eleveId)
    .single();

  if (!eleve || eleve.statut !== "actif") return { error: "Élève introuvable ou suspendu" };
  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) return { error: "Non autorisé sur ce site" };

  const { data: fraisTd } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", eleve.classe_id)
    .single();

  if (!fraisTd) return { error: "Aucun montant de frais TD configuré pour cette classe" };

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id, libelle")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  // Bloquer le paiement si le mois est déjà exonéré ou offert
  const { data: exo } = await supabaseAdmin
    .from("mois_exoneres")
    .select("motif")
    .eq("eleve_id", input.eleveId)
    .eq("mois_souscription", input.moisSouscription)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .maybeSingle();

  if (exo) {
    return { error: `Ce mois est exonéré ou déjà pris en charge (${exo.motif}). Aucun paiement requis.` };
  }

  const { data: paiementsExistants } = await supabaseAdmin
    .from("paiements")
    .select("montant_paye")
    .eq("eleve_id", input.eleveId)
    .eq("mois_souscription", input.moisSouscription)
    .eq("annee_scolaire_id", anneeEnCours.id);

  const resteAvant = resteAPayer(Number(fraisTd.montant), paiementsExistants ?? []);

  if (input.montantPaye > resteAvant) {
    return { error: `Le montant dépasse le reste dû (${resteAvant} F)` };
  }

  const { error } = await supabaseAdmin.from("paiements").insert({
    eleve_id: input.eleveId,
    mois_souscription: input.moisSouscription,
    montant_paye: input.montantPaye,
    date_paiement: input.datePaiement,
    mode_paiement: input.modePaiement,
    annee_scolaire_id: anneeEnCours.id,
    enregistre_par: scope.userId,
  });

  if (error) return { error: error.message };

  const { data: paiementsApres } = await supabaseAdmin
    .from("paiements")
    .select("id, montant_paye, date_paiement, mode_paiement")
    .eq("eleve_id", input.eleveId)
    .eq("mois_souscription", input.moisSouscription)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .order("date_paiement", { ascending: true })
    .order("id", { ascending: true });

  const totalPaye = (paiementsApres ?? []).reduce((sum, p) => sum + Number(p.montant_paye), 0);
  const montantAttendu = Number(fraisTd.montant);
  const resteApres = Math.max(0, montantAttendu - totalPaye);
  const lastPaiementId = (paiementsApres ?? [])[(paiementsApres ?? []).length - 1]?.id;

  revalidatePaiementsPaths();
  return {
    resteApresPaiement: resteApres,
    montantAttendu,
    college: eleve.college,
    anneeLibelle: anneeEnCours.libelle,
    lastPaiementId,
    versements: (paiementsApres ?? []).map((p) => ({
      id: p.id,
      datePaiement: p.date_paiement,
      montantPaye: Number(p.montant_paye),
      modePaiement: p.mode_paiement,
    })),
  };
}

/**
 * Enregistre un paiement multi-mois comptant (100% le jour même, Présentiel ou MoMo).
 * Applique la règle de fidélité :
 *   - 3 mois payés consécutifs le même jour -> 1 mois offert (mois suivant)
 *   - 6 mois payés consécutifs le même jour -> 2 mois offerts (mois suivants, année complète soldée)
 */
export async function enregistrerPaiementMultiMois(
  input: EnregistrerPaiementMultiMoisInput
): Promise<EnregistrerPaiementMultiMoisResult> {
  const scope = await getScopeAndAssert(ROLES_PAIEMENTS);
  const supabaseAdmin = createServiceRoleClient();

  if (!input.moisPayes || input.moisPayes.length === 0) {
    return { error: "Veuillez sélectionner au moins un mois à payer." };
  }

  // Vérifier l'élève
  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classe_id, college, classes(site_id)")
    .eq("id", input.eleveId)
    .single();

  if (!eleve || eleve.statut !== "actif") return { error: "Élève introuvable ou suspendu" };
  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) return { error: "Non autorisé sur ce site" };

  // Vérifier frais_td
  const { data: fraisTd } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", eleve.classe_id)
    .single();

  if (!fraisTd) return { error: "Aucun montant de frais TD configuré pour cette classe" };
  const montantMensuel = Number(fraisTd.montant);

  // Vérifier année en cours
  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id, libelle")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  // Trier les mois selon l'ordre officiel MOIS_SCOLAIRES
  const moisTries = [...input.moisPayes].sort(
    (a, b) => MOIS_SCOLAIRES.indexOf(a) - MOIS_SCOLAIRES.indexOf(b)
  );

  // Vérifier la consécutivité
  for (let i = 0; i < moisTries.length - 1; i++) {
    const idx1 = MOIS_SCOLAIRES.indexOf(moisTries[i]);
    const idx2 = MOIS_SCOLAIRES.indexOf(moisTries[i + 1]);
    if (idx2 !== idx1 + 1) {
      return { error: "Les mois sélectionnés doivent être consécutifs." };
    }
  }

  // Vérifier que chaque mois n'est ni déjà soldé ni déjà exonéré
  const { data: paiementsExistants } = await supabaseAdmin
    .from("paiements")
    .select("mois_souscription, montant_paye")
    .eq("eleve_id", input.eleveId)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .in("mois_souscription", moisTries);

  const { data: exoneresExistants } = await supabaseAdmin
    .from("mois_exoneres")
    .select("mois_souscription, motif")
    .eq("eleve_id", input.eleveId)
    .eq("annee_scolaire_id", anneeEnCours.id)
    .in("mois_souscription", moisTries);

  if ((exoneresExistants ?? []).length > 0) {
    const moisExo = exoneresExistants![0].mois_souscription;
    return { error: `Le mois de ${moisExo} est déjà exonéré (${exoneresExistants![0].motif}).` };
  }

  const payeParMois = new Map<string, number>();
  for (const p of paiementsExistants ?? []) {
    payeParMois.set(p.mois_souscription, (payeParMois.get(p.mois_souscription) ?? 0) + Number(p.montant_paye));
  }

  for (const m of moisTries) {
    const deja = payeParMois.get(m) ?? 0;
    if (deja >= montantMensuel) {
      return { error: `Le mois de ${m} est déjà intégralement soldé.` };
    }
  }

  // Enregistrement des paiements (100% comptant pour chaque mois)
  const paiementsAInserer = moisTries.map((m) => {
    const deja = payeParMois.get(m) ?? 0;
    const montantRestant = Math.max(0, montantMensuel - deja);
    return {
      eleve_id: input.eleveId,
      mois_souscription: m,
      montant_paye: montantRestant,
      date_paiement: input.datePaiement,
      mode_paiement: input.modePaiement,
      annee_scolaire_id: anneeEnCours.id,
      enregistre_par: scope.userId,
    };
  });

  const { error: insertError } = await supabaseAdmin.from("paiements").insert(paiementsAInserer);
  if (insertError) return { error: insertError.message };

  // Règle promotionnelle :
  // 3 mois payés -> 1 mois offert (le suivant)
  // 6 mois payés -> 2 mois offerts (les deux suivants)
  const moisOfferts: MoisScolaire[] = [];
  const nbMoisPayes = moisTries.length;
  const dernierMoisIndex = MOIS_SCOLAIRES.indexOf(moisTries[moisTries.length - 1]);

  let nbMoisOffertsTheorique = 0;
  if (nbMoisPayes >= 6) {
    nbMoisOffertsTheorique = 2;
  } else if (nbMoisPayes >= 3) {
    nbMoisOffertsTheorique = 1;
  }

  for (let step = 1; step <= nbMoisOffertsTheorique; step++) {
    const nextIdx = dernierMoisIndex + step;
    if (nextIdx < MOIS_SCOLAIRES.length) {
      const moisCandidat = MOIS_SCOLAIRES[nextIdx];
      // Vérifier s'il n'est pas déjà payé ou exonéré
      const { data: dejaPayeNext } = await supabaseAdmin
        .from("paiements")
        .select("id")
        .eq("eleve_id", input.eleveId)
        .eq("mois_souscription", moisCandidat)
        .eq("annee_scolaire_id", anneeEnCours.id)
        .limit(1);

      const { data: dejaExoNext } = await supabaseAdmin
        .from("mois_exoneres")
        .select("id")
        .eq("eleve_id", input.eleveId)
        .eq("mois_souscription", moisCandidat)
        .eq("annee_scolaire_id", anneeEnCours.id)
        .limit(1);

      if ((!dejaPayeNext || dejaPayeNext.length === 0) && (!dejaExoNext || dejaExoNext.length === 0)) {
        moisOfferts.push(moisCandidat);
      }
    }
  }

  if (moisOfferts.length > 0) {
    const motifPromo =
      nbMoisPayes >= 6
        ? "Offre 6 mois payés simultanément : mois offert (année complète soldée)"
        : "Offre 3 mois payés simultanément : mois offert";

    const lignesExo = moisOfferts.map((m) => ({
      eleve_id: input.eleveId,
      mois_souscription: m,
      annee_scolaire_id: anneeEnCours.id,
      motif: motifPromo,
      exonere_par: scope.userId,
    }));

    await supabaseAdmin
      .from("mois_exoneres")
      .upsert(lignesExo, { onConflict: "eleve_id, mois_souscription, annee_scolaire_id" });
  }

  const montantTotalPaye = paiementsAInserer.reduce((sum, p) => sum + p.montant_paye, 0);

  revalidatePaiementsPaths();

  let message = `Paiement comptant de ${moisTries.length} mois enregistré avec succès.`;
  if (moisOfferts.length > 0) {
    message += ` Offre appliquée : ${moisOfferts.join(" et ")} offert${moisOfferts.length > 1 ? "s" : ""}.`;
  }

  return {
    moisPayes: moisTries,
    montantTotalPaye,
    moisOfferts,
    message,
    college: eleve.college,
    anneeLibelle: anneeEnCours.libelle,
  };
}

/**
 * §8.7/interdit #4 — suppression réservée coordonnateur/comptable (jamais
 * superviseur, interdit #17), mot de passe + motif vérifiés côté serveur.
 * Le staff utilise Supabase Auth (pas de hash bcrypt exposé côté app) : la
 * vérification du mot de passe se fait en ré-authentifiant l'utilisateur
 * courant via signInWithPassword, équivalent fonctionnel du bcryptjs.compare
 * décrit dans GSR_ARCHITECTURE.md pour les auths custom (parents/TD).
 */
export async function supprimerPaiement(
  paiementId: number,
  motif: string,
  password: string
): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert(ROLES_SUPPRESSION);
  if (!motif.trim()) return { error: "Motif obligatoire" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non authentifié" };

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) return { error: "Mot de passe incorrect" };

  const supabaseAdmin = createServiceRoleClient();

  const { data: paiement } = await supabaseAdmin
    .from("paiements")
    .select(
      "id, mois_souscription, montant_paye, date_paiement, mode_paiement, eleves(nom, prenoms, matricule, classes(site_id))"
    )
    .eq("id", paiementId)
    .single();

  if (!paiement) return { error: "Paiement introuvable" };

  const eleve = (paiement as unknown as { eleves: { nom?: string; prenoms?: string; matricule: string; classes: { site_id: number } } }).eleves;
  if (!siteInScope(scope, eleve.classes.site_id)) return { error: "Non autorisé sur ce site" };

  const { error: insertError } = await supabaseAdmin.from("paiements_supprimes").insert({
    matricule: eleve.matricule,
    mois_souscription: paiement.mois_souscription,
    montant_paye: paiement.montant_paye,
    date_paiement: paiement.date_paiement,
    mode_paiement: paiement.mode_paiement,
    admin_id: scope.userId,
    motif: motif.trim(),
  });
  if (insertError) return { error: insertError.message };

  const { error: deleteError } = await supabaseAdmin.from("paiements").delete().eq("id", paiementId);
  if (deleteError) return { error: deleteError.message };

  const nomComplet = [eleve.nom, eleve.prenoms].filter(Boolean).join(" ");
  const cibleAffichee = nomComplet ? `${nomComplet} (${eleve.matricule})` : eleve.matricule;

  await supabaseAdmin.from("notifications").insert({
    site_id: eleve.classes.site_id,
    contenu: `Paiement supprimé : ${paiement.montant_paye.toLocaleString("fr-FR")} F (${paiement.mois_souscription}) annulé pour ${cibleAffichee} par ${scope.username} — Motif : ${motif.trim()}`,
    roles_cibles: ["coordonnateur", "comptable"],
  });

  revalidatePaiementsPaths();
  return {};
}

/** §12.4/§13 — jamais d'envoi automatique : on journalise le clic, l'utilisateur envoie lui-même via le lien wa.me. */
export async function enregistrerRelanceWhatsapp(
  matricule: string,
  moisSouscription: MoisScolaire,
  montantRestant: number,
  contactParent: string
): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert(ROLES_PAIEMENTS);
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.from("log_whatsapp").insert({
    matricule,
    mois_souscription: moisSouscription,
    montant_restant: montantRestant,
    contact_parent: contactParent,
    envoye_par: scope.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/paiements/en-retard");
  return {};
}
