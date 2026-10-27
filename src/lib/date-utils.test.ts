import { describe, it, expect } from "vitest";
import { parseDateLocale, formaterDateTd, formaterDateCourt, formaterDateMois } from "./date-utils";

describe("date-utils", () => {
  it("parseDateLocale crée une date avec l'année, le mois et le jour corrects en heure locale", () => {
    const d = parseDateLocale("2026-10-31");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // Octobre = index 9
    expect(d.getDate()).toBe(31);
    expect(d.getDay()).toBe(6); // Samedi = 6
  });

  it("parseDateLocale gère une chaîne avec heure attachée", () => {
    const d = parseDateLocale("2026-10-31T08:00:00");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(31);
  });

  it("formaterDateTd affiche le jour exact de la semaine et la date en français", () => {
    const formatted = formaterDateTd("2026-10-31");
    expect(formatted).toBe("samedi 31 octobre");
  });

  it("formaterDateCourt affiche la date courte en français", () => {
    const formatted = formaterDateCourt("2026-10-31");
    expect(formatted).toBe("31/10/2026");
  });

  it("formaterDateMois affiche le jour et le mois", () => {
    const formatted = formaterDateMois("2026-10-31");
    expect(formatted).toBe("31 octobre");
  });

  it("renvoie un tiret pour une date vide", () => {
    expect(formaterDateTd("")).toBe("—");
    expect(formaterDateCourt("")).toBe("—");
    expect(formaterDateMois("")).toBe("—");
  });
});
