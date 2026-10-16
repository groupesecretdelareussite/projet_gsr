import { describe, it, expect } from "vitest";
import type { CreneauItemTD } from "./CandidaturesTDView";

function filtrerCreneaux(liste: CreneauItemTD[], filtre: number | "toutes"): CreneauItemTD[] {
  if (filtre === "toutes") {
    return liste;
  }
  return liste.filter((c) => c.matiereId === filtre);
}

describe("Logique de filtrage Candidatures TD", () => {
  const creneaux: CreneauItemTD[] = [
    {
      id: 101,
      classeId: 1,
      matiereId: 1, // Mathématiques
      nomClasse: "Jéricho — Terminale C",
      nomMatiere: "Mathématiques",
      dateTd: "2026-10-17",
      heureDebut: "08:00:00",
      heureFin: "10:00:00",
      montantPrevu: 15000,
    },
    {
      id: 102,
      classeId: 2,
      matiereId: 1, // Mathématiques
      nomClasse: "Yagbé — Première D",
      nomMatiere: "Mathématiques",
      dateTd: "2026-10-17",
      heureDebut: "10:00:00",
      heureFin: "12:00:00",
      montantPrevu: 15000,
    },
    {
      id: 103,
      classeId: 1,
      matiereId: 2, // Physique-Chimie
      nomClasse: "Jéricho — Terminale C",
      nomMatiere: "Physique-Chimie",
      dateTd: "2026-10-18",
      heureDebut: "08:00:00",
      heureFin: "10:00:00",
      montantPrevu: 15000,
    },
  ];

  it("calcule correctement le nombre de créneaux par matière", () => {
    const counts = new Map<number, number>();
    for (const c of creneaux) {
      counts.set(c.matiereId, (counts.get(c.matiereId) ?? 0) + 1);
    }

    expect(counts.get(1)).toBe(2); // 2 en Maths
    expect(counts.get(2)).toBe(1); // 1 en Physique
    expect(counts.get(3) ?? 0).toBe(0); // 0 en Français
  });

  it("filtre les créneaux par matière principale par défaut", () => {
    const matierePrincipaleId: number = 1;
    const filtres = filtrerCreneaux(creneaux, matierePrincipaleId);

    expect(filtres).toHaveLength(2);
    expect(filtres.every((c) => c.matiereId === 1)).toBe(true);
  });

  it("affiche tous les créneaux lorsque le filtre est 'toutes'", () => {
    const filtres = filtrerCreneaux(creneaux, "toutes");

    expect(filtres).toHaveLength(3);
  });

  it("gère l'état vide quand une matière n'a aucun créneau", () => {
    const filtres = filtrerCreneaux(creneaux, 3); // Français

    expect(filtres).toHaveLength(0);
  });

  it("identifie correctement un créneau hors discipline principale", () => {
    const matierePrincipaleId = 1; // Maths

    const estMatiereDifferente = (creneauMatiereId: number) =>
      matierePrincipaleId !== null && creneauMatiereId !== matierePrincipaleId;

    expect(estMatiereDifferente(creneaux[0].matiereId)).toBe(false); // Maths === Maths
    expect(estMatiereDifferente(creneaux[2].matiereId)).toBe(true);  // Physique !== Maths
  });
});
