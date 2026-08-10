import { guessCountryByPartialPhoneNumber, removeDialCode } from "react-international-phone";

/** Bénin — réforme de la numérotation nov. 2021 : +229 puis exactement 10 chiffres, débutant par 01. */
const REGEX_BENIN = /^\+22901\d{8}$/;
/** Autres pays — on ne maîtrise pas les règles de chaque pays, juste indicatif + chiffres. */
const REGEX_GENERIQUE = /^\+\d{7,14}$/;

export function normaliserNumero(numero: string): string {
  return numero.replace(/\s/g, "");
}

/** §discussion 2026-08-10 — strict pour le Bénin, permissif pour le reste. Appeler sur une valeur déjà normalisée (sans espaces). */
export function validerNumeroTelephone(numero: string): string | null {
  if (numero.length > 15) {
    return "Le numéro ne doit pas dépasser 15 caractères";
  }
  if (numero.startsWith("+229")) {
    return REGEX_BENIN.test(numero) ? null : "Numéro béninois invalide — format attendu : +229 01 XX XX XX XX";
  }
  return REGEX_GENERIQUE.test(numero) ? null : "Numéro invalide — doit commencer par l'indicatif (+...) suivi des chiffres";
}

/**
 * Affichage sans indicatif, chiffres groupés par 2 (ex. "01 97 92 17 81") —
 * jamais utilisé sur la page de modification, qui affiche la valeur brute
 * telle que stockée. `removeDialCode`/`guessCountryByPartialPhoneNumber`
 * (react-international-phone, déjà utilisée pour la saisie) identifient
 * l'indicatif quel que soit le pays plutôt que de supposer une longueur fixe.
 */
export function formaterNumeroAffichage(numero: string | null): string {
  if (!numero) return "—";
  const { country } = guessCountryByPartialPhoneNumber({ phone: numero });
  if (!country) return numero;
  const local = removeDialCode({ phone: numero, dialCode: country.dialCode });
  return (local.match(/.{1,2}/g) ?? []).join(" ");
}
