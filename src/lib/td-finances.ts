import { genererLienWhatsApp } from "@/lib/whatsapp";

export type ReseauMoMo = "mtn" | "moov" | "celtis";

export interface ReseauMoMoConfig {
  code: ReseauMoMo;
  label: string;
  nomCourt: string;
  badgeClass: string;
  placeholderRef: string;
}

export const RESEAUX_MOMO: Record<ReseauMoMo, ReseauMoMoConfig> = {
  mtn: {
    code: "mtn",
    label: "MTN Mobile Money",
    nomCourt: "MTN MoMo",
    badgeClass: "bg-yellow-50 text-yellow-800 border-yellow-200",
    placeholderRef: "Ex: 20261028-123456 ou ID MTN",
  },
  moov: {
    code: "moov",
    label: "Moov Money",
    nomCourt: "Moov Money",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    placeholderRef: "Ex: MP261028.1234.A12345",
  },
  celtis: {
    code: "celtis",
    label: "Celtis Cash (Celtis Bénin)",
    nomCourt: "Celtis Cash",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    placeholderRef: "Ex: CEL-9382019",
  },
};

export const MONTANT_MINIMUM_RETRAIT = 5000;
export const JOUR_OUVERTURE_RETRAIT = 28;
export const NUMERO_WHATSAPP_GSR = process.env.NEXT_PUBLIC_GSR_WHATSAPP || "+229 01 49 76 16 35";

export interface StatutFenetreRetrait {
  estOuverte: boolean;
  jour: number;
  dernierJour: number;
  moisFormat: string; // "2026-10"
  moisLibelle: string; // "octobre 2026"
  prochaineOuvertureLibelle: string; // "28 octobre 2026" ou "28 novembre 2026"
}

/**
 * Détermine si la fenêtre de paiement (du 28 au dernier jour du mois) est active.
 * Gère automatiquement les mois de 28, 29, 30 ou 31 jours.
 */
export function getStatutFenetreRetrait(date = new Date()): StatutFenetreRetrait {
  const jour = date.getDate();
  const annee = date.getFullYear();
  const moisZero = date.getMonth();

  // Dernier jour du mois courant (28, 29, 30 ou 31)
  const dernierJour = new Date(annee, moisZero + 1, 0).getDate();
  const estOuverte = jour >= JOUR_OUVERTURE_RETRAIT;

  const moisFormat = `${annee}-${String(moisZero + 1).padStart(2, "0")}`;
  const moisLibelle = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  let prochaineOuvertureLibelle: string;
  if (estOuverte) {
    // Prochaine ouverture = 28 du mois suivant
    const dateMoisSuivant = new Date(annee, moisZero + 1, JOUR_OUVERTURE_RETRAIT);
    prochaineOuvertureLibelle = dateMoisSuivant.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else {
    // Prochaine ouverture = 28 du mois courant
    const dateCeMois = new Date(annee, moisZero, JOUR_OUVERTURE_RETRAIT);
    prochaineOuvertureLibelle = dateCeMois.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return {
    estOuverte,
    jour,
    dernierJour,
    moisFormat,
    moisLibelle,
    prochaineOuvertureLibelle,
  };
}

/**
 * Génère le message WhatsApp pré-formaté avec toutes les métadonnées nécessaires
 * pour que le coordonnateur retrouve instantanément la transaction.
 */
export function genererMessageWhatsAppReclamation(params: {
  codeDemande: string;
  montant: number;
  nomProf?: string;
  reseau: ReseauMoMo;
  numeroMomo: string;
  statut: "en_attente" | "paye" | "rejete" | string;
  referencePaiement?: string | null;
}): string {
  const { codeDemande, montant, nomProf, reseau, numeroMomo, statut, referencePaiement } = params;
  const nomReseau = RESEAUX_MOMO[reseau]?.label ?? reseau;
  const montantFormate = `${Number(montant).toLocaleString("fr-FR")} F CFA`;
  const signatureProf = nomProf ? ` (${nomProf})` : "";

  if (statut === "paye") {
    return [
      `Bonjour l'administration GSR, je suis un professeur TD${signatureProf}.`,
      `Je vous contacte au sujet de ma demande de retrait *#${codeDemande}* d'un montant de *${montantFormate}*.`,
      `Sur la plateforme, le statut indique "Payé" avec la référence opérateur *${referencePaiement || "Non renseignée"}* vers ${nomReseau} (${numeroMomo}).`,
      `Cependant, je n'ai pas encore reçu le crédit sur mon compte Mobile Money.`,
      `Pouvez-vous vérifier la transaction s'il vous plaît ? Merci !`,
    ].join("\n");
  }

  if (statut === "rejete") {
    return [
      `Bonjour l'administration GSR, je suis un professeur TD${signatureProf}.`,
      `Je vous contacte suite au rejet de ma demande de retrait *#${codeDemande}* de *${montantFormate}*.`,
      `Pouvez-vous m'éclairer sur le motif pour que je puisse corriger ma demande ? Merci !`,
    ].join("\n");
  }

  // En attente
  return [
    `Bonjour l'administration GSR, je suis un professeur TD${signatureProf}.`,
    `Je vous contacte concernant ma demande de retrait *#${codeDemande}* de *${montantFormate}* soumise pour ${nomReseau} (${numeroMomo}).`,
    `Elle est actuellement en attente de traitement. Pouvez-vous me donner des nouvelles ? Merci !`,
  ].join("\n");
}

/**
 * Génère le lien wa.me complet vers le contact de GSR.
 */
export function genererLienReclamationPaiementWhatsApp(params: {
  codeDemande: string;
  montant: number;
  nomProf?: string;
  reseau: ReseauMoMo;
  numeroMomo: string;
  statut: "en_attente" | "paye" | "rejete" | string;
  referencePaiement?: string | null;
}): string {
  const message = genererMessageWhatsAppReclamation(params);
  return genererLienWhatsApp(NUMERO_WHATSAPP_GSR, message);
}
