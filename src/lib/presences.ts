import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

const MOIS_CALENDAIRE = [10, 11, 12, 1, 2, 3, 4, 5]; // Octobre=0 ... Mai=7, aligné sur MOIS_SCOLAIRES

/**
 * `presences.date_presence` n'a pas de colonne "mois" (contrairement à
 * `paiements.mois_souscription`, stockée telle quelle) — filtrer l'historique
 * par mois scolaire suppose de reconstruire une vraie plage de dates.
 * L'année scolaire chevauche deux années civiles : Octobre-Décembre restent
 * sur l'année de `dateDebut`, Janvier-Mai basculent sur l'année suivante.
 */
export function plageDatesMoisScolaire(
  mois: MoisScolaire,
  anneeScolaire: { dateDebut: string; dateFin: string }
): { debut: string; fin: string } {
  const anneeDebut = Number(anneeScolaire.dateDebut.slice(0, 4));
  const index = MOIS_SCOLAIRES.indexOf(mois);
  const anneeCivile = index <= 2 ? anneeDebut : anneeDebut + 1;
  const moisCalendaire = MOIS_CALENDAIRE[index];

  const debut = `${anneeCivile}-${String(moisCalendaire).padStart(2, "0")}-01`;
  const dernierJour = new Date(anneeCivile, moisCalendaire, 0).getDate();
  const fin = `${anneeCivile}-${String(moisCalendaire).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}`;

  return { debut, fin };
}
