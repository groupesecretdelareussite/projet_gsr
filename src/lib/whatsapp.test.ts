import { describe, it, expect } from "vitest";
import { genererLienWhatsApp } from "./whatsapp";

describe("genererLienWhatsApp (§1.3/§13)", () => {
  it("ne garde que les chiffres du numéro (retire le + et les espaces)", () => {
    const lien = genererLienWhatsApp("+229 01 92 00 00", "Bonjour");
    expect(lien).toBe("https://wa.me/22901920000?text=Bonjour");
  });

  it("encode le message pour l'URL", () => {
    const lien = genererLienWhatsApp("+22901920000", "Reste dû : 5000 F & merci !");
    expect(lien).toContain(encodeURIComponent("Reste dû : 5000 F & merci !"));
    expect(lien.startsWith("https://wa.me/22901920000?text=")).toBe(true);
  });
});
