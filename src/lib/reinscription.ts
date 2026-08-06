import type { SupabaseClient } from "@supabase/supabase-js";
import type { MoisScolaire } from "@/lib/constants";

/** Forfait fixe (2026-08-06, décision client) — voir sql/013_penalite_reinscription.sql. */
export const PENALITE_REINSCRIPTION_MONTANT = 500;

const MOIS_CALENDAIRE_INDEX: Record<MoisScolaire, number> = {
  Octobre: 9,
  Novembre: 10,
  Decembre: 11,
  Janvier: 0,
  Fevrier: 1,
  Mars: 2,
  Avril: 3,
  Mai: 4,
};

/**
 * Plage de dates calendaires réelles d'un mois scolaire, ancrée sur l'année
 * civile de `dateDebutAnneeScolaire` — Octobre-Décembre tombent la même
 * année civile que le début d'année scolaire, Janvier-Mai l'année civile
 * suivante (l'année scolaire est à cheval sur le changement d'année).
 */
export function plageDatesMois(mois: MoisScolaire, dateDebutAnneeScolaire: string): { debut: string; fin: string } {
  const anneeDebut = new Date(dateDebutAnneeScolaire).getUTCFullYear();
  const moisIndex = MOIS_CALENDAIRE_INDEX[mois];
  const anneeCivile = moisIndex >= 9 ? anneeDebut : anneeDebut + 1;
  const debut = new Date(Date.UTC(anneeCivile, moisIndex, 1));
  const fin = new Date(Date.UTC(anneeCivile, moisIndex + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { debut: iso(debut), fin: iso(fin) };
}

/**
 * Cas B (venu quand même, montant dû + pénalité) vs Cas C (absent tout le
 * mois, montant dû exonéré) d'une suspension pour défaut de paiement — voir
 * discussion 2026-08-06. `true` dès qu'au moins une présence est enregistrée
 * sur la plage du mois suspendu.
 */
export async function estVenuDansLeMois(
  supabase: SupabaseClient,
  eleveId: number,
  mois: MoisScolaire,
  dateDebutAnneeScolaire: string
): Promise<boolean> {
  const { debut, fin } = plageDatesMois(mois, dateDebutAnneeScolaire);
  const { count } = await supabase
    .from("presences")
    .select("id", { count: "exact", head: true })
    .eq("eleve_id", eleveId)
    .eq("present", true)
    .gte("date_presence", debut)
    .lte("date_presence", fin);
  return (count ?? 0) > 0;
}
