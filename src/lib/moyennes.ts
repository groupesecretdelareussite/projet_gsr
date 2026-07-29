import type { TypeNote } from "@/lib/constants";

export interface NoteMatiere {
  type_note: TypeNote;
  valeur: number;
}

export interface ResultatMoyenneMatiere {
  /** MM — moyenne de la matière (moyenne des interros comptée comme un devoir), Ctrl exclu. `null` si aucune note utilisable (I1/I2/I3/D1/D2 absentes). */
  moyenneMatiere: number | null;
  /** MC = MM × coefficient. `null` si `moyenneMatiere` est `null` OU si le coefficient n'est pas configuré — les deux cas excluent la matière de la moyenne générale. */
  moyenneCoefficiee: number | null;
  coefficient: number | null;
}

function moyenneSimple(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  return valeurs.reduce((somme, v) => somme + v, 0) / valeurs.length;
}

/**
 * MI = moyenne des interros saisies (I1/I2/I3, partielles acceptées) ;
 * MM = moyenne de (MI + D1 + D2, chacun compté seulement s'il existe) ;
 * MC = MM × coefficient. Ctrl n'entre jamais dans le calcul.
 */
export function calculerMoyenneMatiere(notes: NoteMatiere[], coefficient: number | null): ResultatMoyenneMatiere {
  const parType = new Map(notes.map((n) => [n.type_note, n.valeur]));

  const interros = (["I1", "I2", "I3"] as const)
    .map((t) => parType.get(t))
    .filter((v): v is number => v !== undefined);
  const mi = moyenneSimple(interros);

  const composantesMM = [
    ...(mi !== null ? [mi] : []),
    ...(parType.has("D1") ? [parType.get("D1")!] : []),
    ...(parType.has("D2") ? [parType.get("D2")!] : []),
  ];
  const mm = moyenneSimple(composantesMM);

  const mc = mm !== null && coefficient !== null ? mm * coefficient : null;

  return { moyenneMatiere: mm, moyenneCoefficiee: mc, coefficient };
}

export interface MatiereEvaluee {
  matiereId: number;
  resultat: ResultatMoyenneMatiere;
}

export interface MoyenneGenerale {
  /** `null` si aucune matière n'est utilisable (pas de note, ou coefficient non configuré partout). */
  moyenneGenerale: number | null;
  nombreMatieresPrisesEnCompte: number;
  coefficientTotal: number;
}

/** Σ(MC) / Σ(coefficient), uniquement sur les matières avec `moyenneCoefficiee` non nulle (notes ET coefficient présents). */
export function calculerMoyenneGenerale(matieres: MatiereEvaluee[]): MoyenneGenerale {
  const utilisables = matieres.filter((m) => m.resultat.moyenneCoefficiee !== null);

  if (utilisables.length === 0) {
    return { moyenneGenerale: null, nombreMatieresPrisesEnCompte: 0, coefficientTotal: 0 };
  }

  const sommeMC = utilisables.reduce((s, m) => s + m.resultat.moyenneCoefficiee!, 0);
  const coefficientTotal = utilisables.reduce((s, m) => s + m.resultat.coefficient!, 0);

  return {
    moyenneGenerale: coefficientTotal > 0 ? sommeMC / coefficientTotal : null,
    nombreMatieresPrisesEnCompte: utilisables.length,
    coefficientTotal,
  };
}
