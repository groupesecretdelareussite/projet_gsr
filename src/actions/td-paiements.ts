"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { getTdProfesseurSession } from "@/lib/session-td";
import { normaliserNumero, validerNumeroTelephone } from "@/lib/telephone";
import { extraireIpClient } from "@/lib/brute-force";
import {
  getStatutFenetreRetrait,
  MONTANT_MINIMUM_RETRAIT,
  type ReseauMoMo,
} from "@/lib/td-finances";

export interface SoldeProfesseurTD {
  totalGainsClotures: number;
  totalRetraitsPayes: number;
  montantEnAttente: number;
  soldeDisponible: number;
}

/**
 * Calcule le solde en temps réel d'un professeur :
 * Solde = Gains des séances clôturées - Retraits déjà payés - Demandes en cours de traitement.
 */
export async function recupererSoldeEtGainsProfesseur(
  professeurId: number
): Promise<SoldeProfesseurTD> {
  const supabaseAdmin = createServiceRoleClient();

  // 1. Récupérer toutes les séances validées du professeur dont la semaine est clôturée
  const { data: postulations } = await supabaseAdmin
    .schema("td")
    .from("postulations")
    .select("creneau_id, creneaux!inner(montant_prevu, semaines!inner(statut))")
    .eq("professeur_id", professeurId)
    .eq("statut_validation", "Valide")
    .eq("creneaux.semaines.statut", "cloturee");

  const totalGainsClotures = (postulations ?? []).reduce((sum, p) => {
    const creneau = p.creneaux as unknown as { montant_prevu: number } | null;
    return sum + Number(creneau?.montant_prevu ?? 0);
  }, 0);

  // 2. Récupérer l'historique des demandes de retrait du professeur
  const { data: demandes } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .select("montant_demande, statut")
    .eq("professeur_id", professeurId);

  let totalRetraitsPayes = 0;
  let montantEnAttente = 0;

  for (const d of demandes ?? []) {
    if (d.statut === "paye") {
      totalRetraitsPayes += Number(d.montant_demande);
    } else if (d.statut === "en_attente") {
      montantEnAttente += Number(d.montant_demande);
    }
  }

  const soldeDisponible = Math.max(0, totalGainsClotures - totalRetraitsPayes - montantEnAttente);

  return {
    totalGainsClotures,
    totalRetraitsPayes,
    montantEnAttente,
    soldeDisponible,
  };
}

export interface DemanderRetraitInput {
  montant: number;
  reseau: ReseauMoMo;
  numeroMomo: string;
}

/**
 * Soumission d'une demande de retrait par le professeur connecté.
 * Règle : Ouverte du 28 au dernier jour du mois, min 5000 F, max solde disponible, 1 demande/mois.
 */
export async function demanderRetraitProfTD(
  input: DemanderRetraitInput
): Promise<{ error?: string; codeDemande?: string }> {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    return { error: "Non authentifié" };
  }
  const professeurId = session.professeurId;

  // 1. Contrôle de la fenêtre de paiement (du 28 au dernier jour du mois)
  const fenetre = getStatutFenetreRetrait();
  if (!fenetre.estOuverte) {
    return {
      error: `La période de retrait est fermée. Prochaine ouverture le ${fenetre.prochaineOuvertureLibelle}.`,
    };
  }

  // 2. Contrôle du montant
  const montant = Math.round(Number(input.montant));
  if (isNaN(montant) || montant < MONTANT_MINIMUM_RETRAIT) {
    return {
      error: `Le montant minimum de retrait est de ${MONTANT_MINIMUM_RETRAIT.toLocaleString("fr-FR")} F CFA.`,
    };
  }

  // 3. Contrôle du réseau Mobile Money
  if (!["mtn", "moov", "celtis"].includes(input.reseau)) {
    return { error: "Veuillez sélectionner un opérateur Mobile Money valide (MTN, Moov ou Celtis)." };
  }

  // 4. Contrôle et normalisation du numéro Mobile Money
  const telNormalise = normaliserNumero(input.numeroMomo ?? "");
  const errTel = validerNumeroTelephone(telNormalise);
  if (errTel) {
    return { error: `Numéro Mobile Money invalide : ${errTel}` };
  }

  const supabaseAdmin = createServiceRoleClient();

  // 5. Vérifier si une demande est déjà active ou payée pour ce mois
  const { data: existante } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .select("id, code_demande, statut")
    .eq("professeur_id", professeurId)
    .eq("mois", fenetre.moisFormat)
    .in("statut", ["en_attente", "paye"])
    .maybeSingle();

  if (existante) {
    return {
      error: `Vous avez déjà une demande ${existante.statut === "paye" ? "payée" : "en cours de traitement"} pour le mois de ${fenetre.moisLibelle}. Une seule demande par mois est autorisée.`,
    };
  }

  // 6. Vérifier le solde disponible
  const { soldeDisponible } = await recupererSoldeEtGainsProfesseur(professeurId);
  if (montant > soldeDisponible) {
    return {
      error: `Le montant demandé (${montant.toLocaleString("fr-FR")} F) dépasse votre solde disponible (${soldeDisponible.toLocaleString("fr-FR")} F CFA).`,
    };
  }

  // 7. Générer un code dossier unique : PAY-YYYYMM-XXX
  const { count } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .select("id", { count: "exact", head: true })
    .eq("mois", fenetre.moisFormat);

  const sequence = String((count ?? 0) + 1).padStart(3, "0");
  const codeDemande = `PAY-${fenetre.moisFormat.replace("-", "")}-${sequence}`;
  const ip = await extraireIpClient();

  // 8. Insertion en base
  const { error: insertError } = await supabaseAdmin.schema("td").from("demandes_retrait").insert({
    code_demande: codeDemande,
    professeur_id: professeurId,
    mois: fenetre.moisFormat,
    montant_demande: montant,
    reseau_momo: input.reseau,
    numero_momo: telNormalise,
    statut: "en_attente",
    ip_demande: ip,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/td/prof/gains");
  revalidatePath("/td/coord/paiements");
  return { codeDemande };
}

/**
 * Validation d'un paiement par le coordonnateur.
 * Exige la saisie de la référence de transaction de l'opérateur (MTN/Moov/Celtis).
 */
export async function validerPaiementProfTD(
  demandeId: number,
  referencePaiement: string,
  commentaire?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    return { error: "Non autorisé : réservé au coordonnateur" };
  }

  const cleanRef = referencePaiement?.trim();
  if (!cleanRef || cleanRef.length < 3) {
    return { error: "La référence de transaction Mobile Money est obligatoire pour justifier le versement." };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: demande } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .select("id, statut")
    .eq("id", demandeId)
    .maybeSingle();

  if (!demande) {
    return { error: "Demande de retrait introuvable" };
  }
  if (demande.statut !== "en_attente") {
    return { error: "Cette demande a déjà été traitée." };
  }

  const { error: updateError } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .update({
      statut: "paye",
      date_paiement: new Date().toISOString(),
      paye_par: scope.userId,
      reference_paiement: cleanRef,
      commentaire_admin: commentaire?.trim() || null,
    })
    .eq("id", demandeId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/td/coord/paiements");
  revalidatePath("/td/prof/gains");
  revalidatePath("/admin/comptabilite");
  return {};
}

/**
 * Rejet d'une demande de retrait par le coordonnateur (ex: numéro erroné ou compte plafonné).
 * Recrédite automatiquement le solde du professeur en levant la réservation en attente.
 */
export async function rejeterDemandeRetraitProfTD(
  demandeId: number,
  motif: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    return { error: "Non autorisé : réservé au coordonnateur" };
  }

  const cleanMotif = motif?.trim();
  if (!cleanMotif || cleanMotif.length < 3) {
    return { error: "Veuillez renseigner un motif de rejet clair pour informer le professeur." };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: demande } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .select("id, statut")
    .eq("id", demandeId)
    .maybeSingle();

  if (!demande) {
    return { error: "Demande de retrait introuvable" };
  }
  if (demande.statut !== "en_attente") {
    return { error: "Cette demande a déjà été traitée." };
  }

  const { error: updateError } = await supabaseAdmin
    .schema("td")
    .from("demandes_retrait")
    .update({
      statut: "rejete",
      date_rejet: new Date().toISOString(),
      rejete_par: scope.userId,
      commentaire_admin: cleanMotif,
    })
    .eq("id", demandeId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/td/coord/paiements");
  revalidatePath("/td/prof/gains");
  return {};
}
