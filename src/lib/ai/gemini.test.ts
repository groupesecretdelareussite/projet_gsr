import { describe, it, expect } from "vitest";
import {
  isErreurGeminiTransitoire,
  isErreurGeminiModeleIntrouvable,
  messageUtilisateurGemini,
  modelesGeminiAEssayer,
} from "./gemini";

describe("Agent IA — erreurs Gemini", () => {
  const saturation = {
    message: '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
  };

  it("détecte une saturation 503 comme transitoire", () => {
    expect(isErreurGeminiTransitoire(saturation)).toBe(true);
    expect(messageUtilisateurGemini(saturation)).toMatch(/saturé/i);
  });

  it("détecte un modèle retiré", () => {
    const err = { message: "This model models/gemini-2.5-flash is no longer available", status: "NOT_FOUND" };
    expect(isErreurGeminiModeleIntrouvable(err)).toBe(true);
  });

  it("place le modèle principal en tête de liste", () => {
    const models = modelesGeminiAEssayer();
    expect(models[0]).toBe(process.env.GEMINI_MODEL || "gemini-3.6-flash");
    expect(models.length).toBeGreaterThan(1);
  });
});
