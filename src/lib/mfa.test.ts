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

  it("hache avec bcrypt et vérifie avec succès un code saisi même avec espacement différent", async () => {
    const code = "7K9P-4M2X";
    const hash = await hacherCodeSecours(code);

    expect(hash.startsWith("$2")).toBe(true);
    await expect(verifierCodeSecoursHash("7k9p4m2x", hash)).resolves.toBe(true);
    await expect(verifierCodeSecoursHash(" 7K9P - 4M2X ", hash)).resolves.toBe(true);
    await expect(verifierCodeSecoursHash("7K9P-4M2Y", hash)).resolves.toBe(false);
  });

  it("assure la rétrocompatibilité avec les anciens hashs SHA-256 non salés", async () => {
    // Hash SHA-256 brut de "7K9P4M2X"
    const ancienHashSha256 = "bac8f8496d2cd1a0399b4a12213066544ef14e3c4840d69b5d557f02382a1d9d";

    await expect(verifierCodeSecoursHash("7k9p4m2x", ancienHashSha256)).resolves.toBe(true);
    await expect(verifierCodeSecoursHash(" 7K9P - 4M2X ", ancienHashSha256)).resolves.toBe(true);
    await expect(verifierCodeSecoursHash("7K9P-4M2Y", ancienHashSha256)).resolves.toBe(false);
  });
});
