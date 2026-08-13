import { describe, it, expect } from "vitest";
import { calculerMoyenneMatiere, calculerMoyenneGenerale, calculerMoyenneAnnuelle } from "./moyennes";

describe("calculerMoyenneMatiere", () => {
  it("applique la formule complète : MI puis MM puis MC", () => {
    // MI = (12+14+10)/3 = 12 ; MM = (12+16+18)/3 = 15.333... ; MC = MM * 2
    const notes = [
      { type_note: "I1" as const, valeur: 12 },
      { type_note: "I2" as const, valeur: 14 },
      { type_note: "I3" as const, valeur: 10 },
      { type_note: "D1" as const, valeur: 16 },
      { type_note: "D2" as const, valeur: 18 },
    ];
    const resultat = calculerMoyenneMatiere(notes, 2);
    expect(resultat.moyenneMatiere).toBeCloseTo(15.333, 2);
    expect(resultat.moyenneCoefficiee).toBeCloseTo(30.667, 2);
    expect(resultat.coefficient).toBe(2);
  });

  it("ignore la note de contrôle même si elle est saisie", () => {
    const avecCtrl = calculerMoyenneMatiere(
      [
        { type_note: "I1", valeur: 10 },
        { type_note: "Ctrl", valeur: 20 },
      ],
      1
    );
    const sansCtrl = calculerMoyenneMatiere([{ type_note: "I1", valeur: 10 }], 1);
    expect(avecCtrl.moyenneMatiere).toBe(sansCtrl.moyenneMatiere);
  });

  it("calcule MI sur les interros partiellement saisies", () => {
    // Une seule interro : MI = I1 = 8 ; MM = (8+D1)/2
    const resultat = calculerMoyenneMatiere(
      [
        { type_note: "I1", valeur: 8 },
        { type_note: "D1", valeur: 12 },
      ],
      1
    );
    expect(resultat.moyenneMatiere).toBeCloseTo(10, 5);
  });

  it("retourne moyenneMatiere=null si aucune note utilisable (matière sans note)", () => {
    const resultat = calculerMoyenneMatiere([], 1);
    expect(resultat.moyenneMatiere).toBeNull();
    expect(resultat.moyenneCoefficiee).toBeNull();
  });

  it("retourne moyenneMatiere=null si seul un Ctrl est saisi", () => {
    const resultat = calculerMoyenneMatiere([{ type_note: "Ctrl", valeur: 15 }], 1);
    expect(resultat.moyenneMatiere).toBeNull();
  });

  it("retourne moyenneCoefficiee=null quand le coefficient n'est pas configuré, même avec des notes", () => {
    const resultat = calculerMoyenneMatiere([{ type_note: "I1", valeur: 10 }], null);
    expect(resultat.moyenneMatiere).not.toBeNull();
    expect(resultat.moyenneCoefficiee).toBeNull();
    expect(resultat.coefficient).toBeNull();
  });
});

describe("calculerMoyenneGenerale", () => {
  it("pondère par coefficient et exclut les matières non utilisables", () => {
    const matieres = [
      { matiereId: 1, resultat: { moyenneMatiere: 12, moyenneCoefficiee: 24, coefficient: 2 } }, // utilisable
      { matiereId: 2, resultat: { moyenneMatiere: 10, moyenneCoefficiee: 10, coefficient: 1 } }, // utilisable
      { matiereId: 3, resultat: { moyenneMatiere: null, moyenneCoefficiee: null, coefficient: 3 } }, // pas de note -> exclue
      { matiereId: 4, resultat: { moyenneMatiere: 15, moyenneCoefficiee: null, coefficient: null } }, // coef manquant -> exclue
    ];
    const resultat = calculerMoyenneGenerale(matieres);
    // (24 + 10) / (2 + 1) = 11.333...
    expect(resultat.moyenneGenerale).toBeCloseTo(11.333, 2);
    expect(resultat.nombreMatieresPrisesEnCompte).toBe(2);
    expect(resultat.coefficientTotal).toBe(3);
  });

  it("retourne null si aucune matière n'est utilisable", () => {
    const matieres = [
      { matiereId: 1, resultat: { moyenneMatiere: null, moyenneCoefficiee: null, coefficient: 1 } },
      { matiereId: 2, resultat: { moyenneMatiere: 12, moyenneCoefficiee: null, coefficient: null } },
    ];
    const resultat = calculerMoyenneGenerale(matieres);
    expect(resultat.moyenneGenerale).toBeNull();
    expect(resultat.nombreMatieresPrisesEnCompte).toBe(0);
  });
});

describe("calculerMoyenneAnnuelle", () => {
  it("pondère le second semestre double : MA = (MS1 + MS2×2) / 3", () => {
    // (12 + 15*2) / 3 = 14
    expect(calculerMoyenneAnnuelle(12, 15)).toBeCloseTo(14, 5);
  });

  it("retourne null si un des deux semestres n'est pas clôturé", () => {
    expect(calculerMoyenneAnnuelle(null, 15)).toBeNull();
    expect(calculerMoyenneAnnuelle(12, null)).toBeNull();
    expect(calculerMoyenneAnnuelle(null, null)).toBeNull();
  });
});
