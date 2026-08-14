import { describe, it, expect } from "vitest";
import { convertirContactLocal, validerLigneImport, type LigneImportBrute } from "./import-eleves";

describe("convertirContactLocal", () => {
  it("ajoute l'indicatif et le 01 pour un numéro à 8 chiffres", () => {
    expect(convertirContactLocal("97929217")).toBe("+2290197929217");
  });

  it("ajoute juste l'indicatif pour un numéro à 10 chiffres commençant par 01", () => {
    expect(convertirContactLocal("0197929217")).toBe("+2290197929217");
  });

  it("tolère les espaces/tirets dans la saisie", () => {
    expect(convertirContactLocal("01 97 92 92 17")).toBe("+2290197929217");
    expect(convertirContactLocal("97-92-92-17")).toBe("+2290197929217");
  });

  it("reconnaît un numéro déjà saisi avec l'indicatif 229", () => {
    expect(convertirContactLocal("+2290197929217")).toBe("+2290197929217");
    expect(convertirContactLocal("2290197929217")).toBe("+2290197929217");
  });

  it("rejette un 10 chiffres qui ne commence pas par 01", () => {
    expect(convertirContactLocal("0297929217")).toBeNull();
  });

  it("rejette une longueur inattendue", () => {
    expect(convertirContactLocal("12345")).toBeNull();
    expect(convertirContactLocal("123456789012345")).toBeNull();
  });

  it("rejette une chaîne vide", () => {
    expect(convertirContactLocal("")).toBeNull();
  });
});

function ligne(overrides: Partial<LigneImportBrute> = {}): LigneImportBrute {
  return {
    nom: "Doe",
    prenoms: "Jean",
    contactParent: "97929217",
    contactParent2: "",
    college: "Collège Central",
    site: "Jéricho",
    classe: "6ème",
    option: "",
    ...overrides,
  };
}

describe("validerLigneImport", () => {
  it("accepte une ligne complète avec un seul contact (8 chiffres)", () => {
    const resultat = validerLigneImport(ligne());
    expect(resultat.erreur).toBeUndefined();
    expect(resultat.valeurs).toEqual({
      nom: "DOE",
      prenoms: "Jean",
      contactParent: "+2290197929217",
      contactParent2: null,
      college: "COLLÈGE CENTRAL",
      site: "Jéricho",
      classe: "6ème",
      optionM: null,
    });
  });

  it("accepte les deux contacts renseignés", () => {
    const resultat = validerLigneImport(ligne({ contactParent2: "0165000000" }));
    expect(resultat.erreur).toBeUndefined();
    expect(resultat.valeurs?.contactParent2).toBe("+2290165000000");
  });

  it.each(["nom", "prenoms", "college", "site", "classe"] as const)(
    "rejette une ligne sans %s",
    (champ) => {
      const resultat = validerLigneImport(ligne({ [champ]: "" }));
      expect(resultat.erreur).toMatch(/obligatoires/);
    }
  );

  it("rejette une ligne sans aucun contact", () => {
    const resultat = validerLigneImport(ligne({ contactParent: "" }));
    expect(resultat.erreur).toBe("Aucun contact renseigné");
  });

  it("rejette explicitement un contact parent mal formé (ne l'ignore pas silencieusement)", () => {
    const resultat = validerLigneImport(ligne({ contactParent: "123" }));
    expect(resultat.erreur).toBe("Contact parent invalide");
  });

  it("rejette explicitement un contact parent 2 mal formé", () => {
    const resultat = validerLigneImport(ligne({ contactParent2: "123" }));
    expect(resultat.erreur).toBe("Contact parent 2 invalide");
  });

  it("garde l'option quand elle est renseignée", () => {
    const resultat = validerLigneImport(ligne({ option: "M3" }));
    expect(resultat.valeurs?.optionM).toBe("M3");
  });
});
