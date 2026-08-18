import { describe, it, expect } from "vitest";
import { evaluerNoteRecompense } from "./recompenses";

describe("evaluerNoteRecompense", () => {
  describe("Interrogations (I1, I2, I3)", () => {
    it("attribue 200F pour 20/20 en MATHS", () => {
      const res = evaluerNoteRecompense({ typeNote: "I1", valeur: 20, codeMatiere: "MATHS" });
      expect(res).toEqual({ eligible: true, typeGain: "interro", montant: 200 });
    });

    it("attribue 200F pour 20/20 en PCT et SVT", () => {
      expect(evaluerNoteRecompense({ typeNote: "I2", valeur: 20, codeMatiere: "pct" })).toEqual({
        eligible: true,
        typeGain: "interro",
        montant: 200,
      });
      expect(evaluerNoteRecompense({ typeNote: "I3", valeur: 20, codeMatiere: "SVT" })).toEqual({
        eligible: true,
        typeGain: "interro",
        montant: 200,
      });
    });

    it("rejette une interro scientifique avec 19.5/20 (20 exact exigé)", () => {
      const res = evaluerNoteRecompense({ typeNote: "I1", valeur: 19.5, codeMatiere: "MATHS" });
      expect(res).toEqual({ eligible: false, typeGain: null, montant: 0 });
    });

    it("rejette une interro non scientifique même avec 20/20 (ex. Français, Philo)", () => {
      expect(evaluerNoteRecompense({ typeNote: "I1", valeur: 20, codeMatiere: "FR" })).toEqual({
        eligible: false,
        typeGain: null,
        montant: 0,
      });
      expect(evaluerNoteRecompense({ typeNote: "I2", valeur: 20, codeMatiere: "PHILO" })).toEqual({
        eligible: false,
        typeGain: null,
        montant: 0,
      });
    });
  });

  describe("Devoirs (D1, D2)", () => {
    it("attribue 500F pour 18/20 en Français (toutes matières)", () => {
      const res = evaluerNoteRecompense({ typeNote: "D1", valeur: 18, codeMatiere: "FR" });
      expect(res).toEqual({ eligible: true, typeGain: "devoir", montant: 500 });
    });

    it("attribue 500F pour 19.5/20 en SVT et 20/20 en Philo", () => {
      expect(evaluerNoteRecompense({ typeNote: "D1", valeur: 19.5, codeMatiere: "SVT" })).toEqual({
        eligible: true,
        typeGain: "devoir",
        montant: 500,
      });
      expect(evaluerNoteRecompense({ typeNote: "D2", valeur: 20, codeMatiere: "PHILO" })).toEqual({
        eligible: true,
        typeGain: "devoir",
        montant: 500,
      });
    });

    it("rejette un devoir avec 17.5/20 (minimum 18 exigé)", () => {
      const res = evaluerNoteRecompense({ typeNote: "D2", valeur: 17.5, codeMatiere: "HG" });
      expect(res).toEqual({ eligible: false, typeGain: null, montant: 0 });
    });
  });

  describe("Autres types de notes", () => {
    it("rejette les notes de contrôle (Ctrl)", () => {
      expect(evaluerNoteRecompense({ typeNote: "Ctrl", valeur: 20, codeMatiere: "MATHS" })).toEqual({
        eligible: false,
        typeGain: null,
        montant: 0,
      });
    });
  });
});
