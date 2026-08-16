import { describe, it, expect } from "vitest";
import { plageDatesMoisScolaire } from "./presences";

describe("plageDatesMoisScolaire", () => {
  const anneeScolaire = { dateDebut: "2026-10-01", dateFin: "2027-05-31" };

  it("Octobre reste sur l'année de dateDebut", () => {
    expect(plageDatesMoisScolaire("Octobre", anneeScolaire)).toEqual({ debut: "2026-10-01", fin: "2026-10-31" });
  });

  it("Decembre reste sur l'année de dateDebut, 31 jours", () => {
    expect(plageDatesMoisScolaire("Decembre", anneeScolaire)).toEqual({ debut: "2026-12-01", fin: "2026-12-31" });
  });

  it("Janvier bascule sur l'année suivante", () => {
    expect(plageDatesMoisScolaire("Janvier", anneeScolaire)).toEqual({ debut: "2027-01-01", fin: "2027-01-31" });
  });

  it("Fevrier calcule le bon dernier jour (année non bissextile)", () => {
    expect(plageDatesMoisScolaire("Fevrier", anneeScolaire)).toEqual({ debut: "2027-02-01", fin: "2027-02-28" });
  });

  it("Mai, dernier mois scolaire", () => {
    expect(plageDatesMoisScolaire("Mai", anneeScolaire)).toEqual({ debut: "2027-05-01", fin: "2027-05-31" });
  });
});
