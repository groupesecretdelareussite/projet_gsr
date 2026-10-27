/**
 * Utilitaires pour manipuler et formater les dates sans subir les décalages de fuseau horaire (Timezone offset).
 *
 * Problème résolu :
 * Selon la spécification ECMAScript, `new Date("YYYY-MM-DD")` interprète la chaîne comme minuit UTC (00:00:00Z).
 * Dans un navigateur dont l'appareil a un fuseau horaire avec décalage négatif (UTC-1 à UTC-5, fréquent sur les
 * téléphones importés, configurés sur les Amériques, ou sous VPN), `toLocaleDateString()` convertit l'heure UTC
 * en heure locale, ce qui fait reculer la date à la veille (ex: un samedi devient un vendredi).
 *
 * En décomposant la chaîne en [année, mois, jour] et en instanciant `new Date(annee, mois - 1, jour)`,
 * l'objet Date est créé à minuit heure locale sur n'importe quel appareil, garantissant un affichage exact.
 */

/**
 * Parse une chaîne de date au format "YYYY-MM-DD" (ou commençant par ce format)
 * en un objet Date ancré à minuit heure locale.
 */
export function parseDateLocale(dateStr: string): Date {
  const morceaux = dateStr.trim().slice(0, 10).split("-");
  const annee = Number(morceaux[0]) || 1970;
  const mois = Number(morceaux[1]) || 1;
  const jour = Number(morceaux[2]) || 1;
  return new Date(annee, mois - 1, jour);
}

/**
 * Formate une chaîne "YYYY-MM-DD" en français complet avec jour de la semaine.
 * Ex: "samedi 31 octobre"
 */
export function formaterDateTd(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }
): string {
  if (!dateStr) return "—";
  const date = parseDateLocale(dateStr);
  return date.toLocaleDateString("fr-FR", options);
}

/**
 * Formate une chaîne "YYYY-MM-DD" en date courte française.
 * Ex: "31/10/2026"
 */
export function formaterDateCourt(dateStr: string): string {
  if (!dateStr) return "—";
  const date = parseDateLocale(dateStr);
  return date.toLocaleDateString("fr-FR");
}

/**
 * Formate une chaîne "YYYY-MM-DD" en jour et mois.
 * Ex: "31 octobre"
 */
export function formaterDateMois(dateStr: string): string {
  if (!dateStr) return "—";
  const date = parseDateLocale(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
