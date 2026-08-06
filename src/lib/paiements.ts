import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

/**
 * §1.1 GSR_ARCHITECTURE.md — année scolaire Octobre → Mai. Mappe une date sur
 * le mois scolaire correspondant, `null` si on est hors période (juin-septembre).
 */
export function moisCourant(date: Date): MoisScolaire | null {
  // getMonth() : 0=janvier ... 11=décembre. Index dans MOIS_SCOLAIRES : Octobre=0 ... Mai=7.
  const index = [9, 10, 11, 0, 1, 2, 3, 4].indexOf(date.getMonth());
  return index === -1 ? null : MOIS_SCOLAIRES[index];
}

/**
 * §12.4 GSR_ARCHITECTURE.md — règle du 15 : avant le 16 du mois, les retards
 * du mois courant ne sont pas affichés (seuls les mois précédents le sont).
 * À partir du 16, le mois courant est inclus.
 *
 * Hors Octobre-Mai, `moisCourant()` renvoie `null` dans deux situations très
 * différentes qu'il faut distinguer via les vraies dates de l'année scolaire
 * en cours (comme `dansPeriodeEnCours()` dans donnees-scolaires/page.tsx) :
 * avant `dateDebut` → rien ne s'est encore passé, aucun mois à afficher ;
 * après `dateFin` → l'année est terminée, les 8 mois sont légitimement
 * consultables pour le bilan de fin d'année.
 */
export function moisVisiblesRetard(date: Date, anneeScolaire: { dateDebut: string; dateFin: string } | null): MoisScolaire[] {
  const courant = moisCourant(date);
  if (!courant) {
    if (!anneeScolaire) return [];
    const iso = date.toISOString().slice(0, 10);
    if (iso < anneeScolaire.dateDebut) return [];
    if (iso > anneeScolaire.dateFin) return [...MOIS_SCOLAIRES];
    return [];
  }

  const indexCourant = MOIS_SCOLAIRES.indexOf(courant);
  const inclureMoisCourant = date.getDate() > 15;
  const dernierIndexVisible = inclureMoisCourant ? indexCourant : indexCourant - 1;

  return MOIS_SCOLAIRES.slice(0, dernierIndexVisible + 1);
}

/** Mois scolaire précédent au sein de la même année scolaire, `null` pour Octobre (pas de comparaison inter-années). */
export function moisPrecedent(mois: MoisScolaire): MoisScolaire | null {
  const index = MOIS_SCOLAIRES.indexOf(mois);
  return index > 0 ? MOIS_SCOLAIRES[index - 1] : null;
}

/**
 * §12.3 GSR_ARCHITECTURE.md — mois scolaire à vérifier par la suspension
 * automatique, exécutée le 1er de chaque mois : le mois calendaire précédent
 * la date de référence, mappé sur le cycle scolaire. `null` si ce mois
 * précédent tombe hors Octobre-Mai (ex. le 1er octobre vérifie septembre,
 * qui n'existe pas côté scolaire → pas d'exécution, cf. "entre novembre et
 * juin inclus" dans l'archi).
 */
export function moisAVerifierSuspensionAuto(dateReference: Date): MoisScolaire | null {
  return moisCourant(new Date(dateReference.getFullYear(), dateReference.getMonth() - 1, 1));
}

/** §12.5 — reste dû = montant attendu - somme déjà payée (jamais négatif). */
export function resteAPayer(montantAttendu: number, paiements: { montant_paye: number }[]): number {
  const total = paiements.reduce((sum, p) => sum + p.montant_paye, 0);
  return Math.max(0, montantAttendu - total);
}
