import { validerNumeroTelephone } from "@/lib/telephone";

export const ENTETES_MODELE_IMPORT = [
  "Nom",
  "Prénoms",
  "Contact parent (WhatsApp)",
  "Contact parent 2",
  "Collège",
  "Site",
  "Classe",
  "Option",
] as const;

export interface LigneImportBrute {
  nom: string;
  prenoms: string;
  contactParent: string;
  contactParent2: string;
  college: string;
  site: string;
  classe: string;
  option: string;
}

export interface LigneImportValidee {
  nom: string;
  prenoms: string;
  contactParent: string | null;
  contactParent2: string | null;
  college: string;
  site: string;
  classe: string;
  optionM: string | null;
}

/**
 * La grande majorité des contacts saisis dans le fichier auront déjà le "01"
 * (10 chiffres), mais certains n'auront que les 8 chiffres du numéro — dans
 * ce cas on ajoute à la fois le "01" et l'indicatif. Toujours produire le
 * format international `+22901XXXXXXXX` attendu par `validerNumeroTelephone`
 * (telephone.ts), jamais le format local que stockait l'ancien système.
 */
export function convertirContactLocal(brut: string): string | null {
  let chiffres = brut.replace(/\D/g, "");

  // Déjà saisi avec l'indicatif (229 + 01 + 8 chiffres = 13 chiffres) — on le
  // retire pour retomber sur le même traitement que les deux cas ci-dessous.
  if (chiffres.length === 13 && chiffres.startsWith("229")) {
    chiffres = chiffres.slice(3);
  }

  if (chiffres.length === 8) {
    return `+22901${chiffres}`;
  }
  if (chiffres.length === 10 && chiffres.startsWith("01")) {
    return `+229${chiffres}`;
  }
  return null;
}

/**
 * Validation pure d'une ligne du fichier importé — aucun accès DB ici (la
 * résolution classe/site, la détection de doublon et la génération du
 * matricule se font dans l'action, qui a besoin de Supabase). Un contact
 * saisi mais mal formé rejette la ligne explicitement plutôt que de
 * l'importer silencieusement sans ce contact — l'utilisateur doit corriger
 * le fichier plutôt que perdre une donnée sans le savoir.
 */
export function validerLigneImport(brut: LigneImportBrute): { valeurs?: LigneImportValidee; erreur?: string } {
  const nom = brut.nom.trim();
  const prenoms = brut.prenoms.trim();
  const college = brut.college.trim();
  const site = brut.site.trim();
  const classe = brut.classe.trim();
  const option = brut.option.trim();

  if (!nom || !prenoms || !college || !site || !classe) {
    return { erreur: "Champs obligatoires manquants (nom, prénoms, collège, site, classe)" };
  }

  let contactParent: string | null = null;
  const contactParentBrut = brut.contactParent.trim();
  if (contactParentBrut) {
    const converti = convertirContactLocal(contactParentBrut);
    if (!converti || validerNumeroTelephone(converti)) {
      return { erreur: "Contact parent invalide" };
    }
    contactParent = converti;
  }

  let contactParent2: string | null = null;
  const contactParent2Brut = brut.contactParent2.trim();
  if (contactParent2Brut) {
    const converti = convertirContactLocal(contactParent2Brut);
    if (!converti || validerNumeroTelephone(converti)) {
      return { erreur: "Contact parent 2 invalide" };
    }
    contactParent2 = converti;
  }

  if (!contactParent && !contactParent2) {
    return { erreur: "Aucun contact renseigné" };
  }

  return {
    valeurs: {
      nom: nom.toUpperCase(),
      prenoms,
      contactParent,
      contactParent2,
      college: college.toUpperCase(),
      site,
      classe,
      optionM: option || null,
    },
  };
}
