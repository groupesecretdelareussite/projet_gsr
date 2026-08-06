import { describe, it, expect } from "vitest";
import { moisCourant, moisVisiblesRetard, moisPrecedent, resteAPayer, moisAVerifierSuspensionAuto } from "./paiements";
import { MOIS_SCOLAIRES } from "./constants";

describe("moisCourant", () => {
  it("mappe chaque mois du cycle scolaire (Octobre → Mai)", () => {
    expect(moisCourant(new Date(2025, 9, 15))).toBe("Octobre"); // getMonth() 9 = octobre
    expect(moisCourant(new Date(2025, 10, 1))).toBe("Novembre");
    expect(moisCourant(new Date(2025, 11, 1))).toBe("Decembre");
    expect(moisCourant(new Date(2026, 0, 1))).toBe("Janvier");
    expect(moisCourant(new Date(2026, 1, 1))).toBe("Fevrier");
    expect(moisCourant(new Date(2026, 2, 1))).toBe("Mars");
    expect(moisCourant(new Date(2026, 3, 1))).toBe("Avril");
    expect(moisCourant(new Date(2026, 4, 31))).toBe("Mai");
  });

  it("renvoie null hors période scolaire (juin à septembre)", () => {
    expect(moisCourant(new Date(2026, 5, 1))).toBeNull(); // juin
    expect(moisCourant(new Date(2026, 6, 15))).toBeNull(); // juillet
    expect(moisCourant(new Date(2026, 7, 1))).toBeNull(); // août
    expect(moisCourant(new Date(2025, 8, 30))).toBeNull(); // septembre
  });
});

describe("moisPrecedent", () => {
  it("renvoie null pour Octobre (pas de comparaison inter-années)", () => {
    expect(moisPrecedent("Octobre")).toBeNull();
  });

  it("renvoie le mois scolaire précédent pour les autres mois", () => {
    expect(moisPrecedent("Novembre")).toBe("Octobre");
    expect(moisPrecedent("Mai")).toBe("Avril");
  });
});

describe("moisVisiblesRetard — règle du 15 (§12.4)", () => {
  const anneeScolaire = { dateDebut: "2025-10-01", dateFin: "2026-05-31" };

  it("exclut le mois courant avant le 16 du mois", () => {
    const visibles = moisVisiblesRetard(new Date(2026, 1, 10), anneeScolaire); // 10 février
    expect(visibles).toEqual(["Octobre", "Novembre", "Decembre", "Janvier"]);
  });

  it("inclut le mois courant à partir du 16", () => {
    const visibles = moisVisiblesRetard(new Date(2026, 1, 16), anneeScolaire); // 16 février
    expect(visibles).toEqual(["Octobre", "Novembre", "Decembre", "Janvier", "Fevrier"]);
  });

  it("renvoie une liste vide avant le 16 octobre (aucun mois précédent dans l'année scolaire)", () => {
    expect(moisVisiblesRetard(new Date(2025, 9, 10), anneeScolaire)).toEqual([]);
  });

  it("inclut Octobre à partir du 16 octobre", () => {
    expect(moisVisiblesRetard(new Date(2025, 9, 16), anneeScolaire)).toEqual(["Octobre"]);
  });

  it("avant le début de l'année scolaire (ex. août, préparation de rentrée), renvoie une liste vide", () => {
    expect(moisVisiblesRetard(new Date(2025, 7, 1), anneeScolaire)).toEqual([]);
  });

  it("après la fin de l'année scolaire (ex. juillet, bilan de fin d'année), renvoie tous les mois", () => {
    expect(moisVisiblesRetard(new Date(2026, 6, 1), anneeScolaire)).toEqual([...MOIS_SCOLAIRES]);
  });

  it("sans année scolaire en cours, renvoie une liste vide", () => {
    expect(moisVisiblesRetard(new Date(2026, 6, 1), null)).toEqual([]);
  });
});

describe("moisAVerifierSuspensionAuto (§12.3)", () => {
  it("le 1er novembre, vérifie octobre", () => {
    expect(moisAVerifierSuspensionAuto(new Date(2026, 10, 1))).toBe("Octobre");
  });

  it("le 1er juin, vérifie mai (dernier mois scolaire)", () => {
    expect(moisAVerifierSuspensionAuto(new Date(2026, 5, 1))).toBe("Mai");
  });

  it("le 1er octobre, ne vérifie rien (septembre n'est pas un mois scolaire)", () => {
    expect(moisAVerifierSuspensionAuto(new Date(2026, 9, 1))).toBeNull();
  });

  it("le 1er juillet, ne vérifie rien (hors période)", () => {
    expect(moisAVerifierSuspensionAuto(new Date(2026, 6, 1))).toBeNull();
  });

  it("le 1er janvier, vérifie décembre (à cheval sur le changement d'année civile)", () => {
    expect(moisAVerifierSuspensionAuto(new Date(2027, 0, 1))).toBe("Decembre");
  });
});

describe("resteAPayer (§12.5)", () => {
  it("renvoie le montant attendu quand rien n'a été payé", () => {
    expect(resteAPayer(15000, [])).toBe(15000);
  });

  it("soustrait la somme des paiements partiels", () => {
    expect(resteAPayer(15000, [{ montant_paye: 5000 }, { montant_paye: 3000 }])).toBe(7000);
  });

  it("renvoie 0 quand le montant est soldé", () => {
    expect(resteAPayer(15000, [{ montant_paye: 15000 }])).toBe(0);
  });

  it("ne renvoie jamais un montant négatif en cas de dépassement", () => {
    expect(resteAPayer(15000, [{ montant_paye: 20000 }])).toBe(0);
  });
});
