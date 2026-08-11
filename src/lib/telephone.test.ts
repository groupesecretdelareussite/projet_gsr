import { describe, it, expect } from "vitest";
import { normaliserNumero, validerNumeroTelephone } from "./telephone";

describe("normaliserNumero", () => {
  it("retire les espaces d'un numéro normal", () => {
    expect(normaliserNumero("+229 01 97 92 17 81")).toBe("+2290197921781");
  });

  it("laisse passer une chaîne vide", () => {
    expect(normaliserNumero("")).toBe("");
  });

  it("ramène à vide un indicatif seul, sans aucun chiffre après (bug PhoneInput 2026-08-11)", () => {
    expect(normaliserNumero("+229")).toBe("");
  });

  it("ramène à vide un indicatif seul pour un autre pays", () => {
    expect(normaliserNumero("+33")).toBe("");
  });

  it("ne touche pas à un vrai numéro béninois complet", () => {
    expect(normaliserNumero("+2290197921781")).toBe("+2290197921781");
  });
});

describe("validerNumeroTelephone", () => {
  it("accepte un numéro béninois conforme à la réforme 2021", () => {
    expect(validerNumeroTelephone("+2290197921781")).toBeNull();
  });

  it("rejette un numéro béninois qui ne commence pas par 01", () => {
    expect(validerNumeroTelephone("+22997921781")).not.toBeNull();
  });
});
