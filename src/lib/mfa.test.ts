import { describe, it, expect } from "vitest";
import {
  normaliserCodeSecours,
  formaterCodeSecours,
  genererLotCodesSecours,
  hacherCodeSecours,
  verifierCodeSecoursHash,
} from "./mfa";

describe("mfa helper", () => {
  it("génère exactement 5 codes uniques formatés XXXX-XXXX", () => {
    const lot = genererLotCodesSecours(5);
    expect(lot).toHaveLength(5);
    const unique = new Set(lot);
    expect(unique.size).toBe(5);

    for (const code of lot) {
      expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    }
  });

  it("normalise correctement les saisies avec tirets, espaces ou minuscules", () => {
    expect(normaliserCodeSecours("abcd-efgh")).toBe("ABCDEFGH");
    expect(normaliserCodeSecours(" ab cd - ef gh ")).toBe("ABCDEFGH");
    expect(normaliserCodeSecours("23456789")).toBe("23456789");
  });

  it("formate un code de 8 caractères avec un tiret médian", () => {
    expect(formaterCodeSecours("ABCDEFGH")).toBe("ABCD-EFGH");
    expect(formaterCodeSecours("abcd-efgh")).toBe("ABCD-EFGH");
  });

  it("hache et vérifie avec succès un code saisi même avec espacement différent", () => {
    const code = "7K9P-4M2X";
    const hash = hacherCodeSecours(code);

    expect(verifierCodeSecoursHash("7k9p4m2x", hash)).toBe(true);
    expect(verifierCodeSecoursHash(" 7K9P - 4M2X ", hash)).toBe(true);
    expect(verifierCodeSecoursHash("7K9P-4M2Y", hash)).toBe(false);
  });
});
