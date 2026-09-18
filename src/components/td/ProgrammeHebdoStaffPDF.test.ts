import { describe, it, expect } from "vitest";
import type {
  ProgrammeHebdoDataPDF,
  JourProgrammePDF,
  LigneCreneauPDF,
} from "./ProgrammeHebdoStaffPDF";

describe("ProgrammeHebdoStaffPDF", () => {
  it("valide la structure de données à 4 colonnes strictes pour le PDF Paysage", () => {
    const ligne: LigneCreneauPDF = {
      id: 1,
      heure: "08:00 – 10:00",
      classe: "Terminale D",
      matiere: "Mathématiques",
      professeur: "ADANVOESSI Jean-Paul · +229 97 12 34 56",
      ordreNiveau: 7,
    };

    expect(ligne.heure).toBe("08:00 – 10:00");
    expect(ligne.classe).toBe("Terminale D");
    expect(ligne.matiere).toBe("Mathématiques");
    expect(ligne.professeur).toContain("ADANVOESSI");
    expect(ligne.professeur).toContain("+229 97 12 34 56");
  });

  it("gère plusieurs tableaux quotidiens distincts (ex: Mercredi et Samedi)", () => {
    const jours: JourProgrammePDF[] = [
      {
        dateIso: "2026-10-14",
        dateFormatee: "Mercredi 14 Octobre 2026",
        creneaux: [
          {
            id: 10,
            heure: "15:00 – 17:00",
            classe: "3ème",
            matiere: "Physique-Chimie",
            professeur: "KOUASSI Marc · +229 95 00 11 22",
            ordreNiveau: 4,
          },
        ],
      },
      {
        dateIso: "2026-10-17",
        dateFormatee: "Samedi 17 Octobre 2026",
        creneaux: [
          {
            id: 20,
            heure: "08:00 – 10:00",
            classe: "6ème",
            matiere: "Mathématiques",
            professeur: "TOSSOU Pierre · +229 96 33 44 55",
            ordreNiveau: 1,
          },
          {
            id: 21,
            heure: "08:00 – 10:00",
            classe: "Terminale D",
            matiere: "SVT",
            professeur: "Non attribué",
            ordreNiveau: 7,
          },
        ],
      },
    ];

    const dataPdf: ProgrammeHebdoDataPDF = {
      nomSite: "Jéricho",
      libelleSemaine: "Semaine 02",
      dateDebut: "2026-10-12",
      dateFin: "2026-10-18",
      dateGeneration: "18/09/2026 à 07:30",
      jours,
    };

    expect(dataPdf.jours).toHaveLength(2);
    expect(dataPdf.jours[0].dateFormatee).toBe("Mercredi 14 Octobre 2026");
    expect(dataPdf.jours[1].dateFormatee).toBe("Samedi 17 Octobre 2026");
    expect(dataPdf.nomSite).toBe("Jéricho");
    expect(dataPdf.jours[1].creneaux[1].professeur).toBe("Non attribué");
  });
});
