import { type TypeNote } from "@/lib/constants";

export const MATIERES_SCIENTIFIQUES_CODES = ["MATHS", "PCT", "SVT"] as const;
export const MONTANT_RECOMPENSE_INTERRO = 200;
export const MONTANT_RECOMPENSE_DEVOIR = 500;

export type TypeGainRecompense = "interro" | "devoir";

export interface EvaluationNoteResult {
  eligible: boolean;
  typeGain: TypeGainRecompense | null;
  montant: number;
}

/**
 * Évalue si une note donne droit à une récompense financière.
 *
 * Règles (§discussion 2026-08-18) :
 * - Interrogations (I1, I2, I3) : matières scientifiques uniquement (MATHS, PCT, SVT)
 *   avec une note exacte de 20/20 requise -> 200 F.
 * - Devoirs (D1, D2) : toutes matières confondues, avec une note >= 18/20 requise -> 500 F.
 * - Autres types (Ctrl) ou notes non qualifiées -> 0 F.
 */
export function evaluerNoteRecompense(input: {
  typeNote: string;
  valeur: number;
  codeMatiere: string;
}): EvaluationNoteResult {
  const code = (input.codeMatiere ?? "").trim().toUpperCase();
  const type = input.typeNote as TypeNote;
  const valeur = Number(input.valeur);

  // 1. Interrogations en sciences (note exacte de 20)
  if (["I1", "I2", "I3"].includes(type)) {
    const estScientifique = (MATIERES_SCIENTIFIQUES_CODES as readonly string[]).includes(code);
    if (estScientifique && valeur === 20) {
      return { eligible: true, typeGain: "interro", montant: MONTANT_RECOMPENSE_INTERRO };
    }
  }

  // 2. Devoirs toutes matières (note >= 18)
  if (["D1", "D2"].includes(type)) {
    if (valeur >= 18 && valeur <= 20) {
      return { eligible: true, typeGain: "devoir", montant: MONTANT_RECOMPENSE_DEVOIR };
    }
  }

  return { eligible: false, typeGain: null, montant: 0 };
}
