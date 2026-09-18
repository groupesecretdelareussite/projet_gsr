import { describe, it, expect } from "vitest";
import {
  getOrdreNiveau,
  comparerClasses,
  regrouperEtTrierCreneauxParClasse,
  type ClasseMetadata,
  type CreneauDeBase,
} from "./programmes-tri";

describe("programmes-tri", () => {
  describe("getOrdreNiveau", () => {
    it("utilise la valeur ordre en base si elle est valide (> 0)", () => {
      expect(getOrdreNiveau("Classe Spéciale", 3)).toBe(3);
    });

    it("déduit correctement l'ordre pour toutes les classes scolaires courantes", () => {
      expect(getOrdreNiveau("6ème")).toBe(1);
      expect(getOrdreNiveau("6e A")).toBe(1);
      expect(getOrdreNiveau("5ème")).toBe(2);
      expect(getOrdreNiveau("4ème")).toBe(3);
      expect(getOrdreNiveau("3ème")).toBe(4);
      expect(getOrdreNiveau("Seconde AB")).toBe(5);
      expect(getOrdreNiveau("Seconde CD")).toBe(5);
      expect(getOrdreNiveau("Première AB")).toBe(6);
      expect(getOrdreNiveau("Première CD")).toBe(6);
      expect(getOrdreNiveau("Terminale A")).toBe(7);
      expect(getOrdreNiveau("Terminale D")).toBe(7);
    });

    it("renvoie 99 pour une classe inconnue sans ordre en base", () => {
      expect(getOrdreNiveau("Club Informatique")).toBe(99);
    });
  });

  describe("comparerClasses", () => {
    it("trie selon le Critère 1 : ordre du niveau scolaire croissant (6ème → Terminale)", () => {
      const c6e = { nom: "6ème", ordre: 1 };
      const c3e = { nom: "3ème", ordre: 4 };
      const cTle = { nom: "Terminale D", ordre: 7 };

      expect(comparerClasses(c6e, c3e)).toBeLessThan(0);
      expect(comparerClasses(c3e, cTle)).toBeLessThan(0);
      expect(comparerClasses(cTle, c6e)).toBeGreaterThan(0);
    });

    it("trie selon le Critère 2 : nom de la classe alphabétique à niveau égal (ex: Terminale A avant Terminale D)", () => {
      const tleA = { nom: "Terminale A", ordre: 7 };
      const tleB = { nom: "Terminale B", ordre: 7 };
      const tleC = { nom: "Terminale C", ordre: 7 };
      const tleD = { nom: "Terminale D", ordre: 7 };

      expect(comparerClasses(tleA, tleD)).toBeLessThan(0);
      expect(comparerClasses(tleB, tleC)).toBeLessThan(0);
      expect(comparerClasses(tleD, tleA)).toBeGreaterThan(0);
    });

    it("gère les séries de Seconde (Seconde AB avant Seconde CD)", () => {
      const secAB = { nom: "Seconde AB", ordre: 5 };
      const secCD = { nom: "Seconde CD", ordre: 5 };

      expect(comparerClasses(secAB, secCD)).toBeLessThan(0);
    });
  });

  describe("regrouperEtTrierCreneauxParClasse", () => {
    it("classe les groupes par niveau (6ème avant Terminale) même si la Terminale commence plus tôt", () => {
      const classesMap = new Map<number, ClasseMetadata>([
        [101, { id: 101, nom_classe: "Terminale D", site_id: 1, ordre: 7 }],
        [102, { id: 102, nom_classe: "6ème", site_id: 1, ordre: 1 }],
        [103, { id: 103, nom_classe: "Terminale A", site_id: 1, ordre: 7 }],
        [104, { id: 104, nom_classe: "3ème", site_id: 1, ordre: 4 }],
      ]);

      // Créneaux mélangés temporellement : Terminale à 08h, 6ème à 10h
      const creneaux: CreneauDeBase[] = [
        {
          id: 1,
          classe_id: 101, // Terminale D
          matiere_id: 1,
          date_td: "2026-10-17",
          heure_debut: "08:00",
          heure_fin: "10:00",
        },
        {
          id: 2,
          classe_id: 102, // 6ème
          matiere_id: 2,
          date_td: "2026-10-17",
          heure_debut: "10:00",
          heure_fin: "12:00",
        },
        {
          id: 3,
          classe_id: 103, // Terminale A
          matiere_id: 1,
          date_td: "2026-10-17",
          heure_debut: "08:00",
          heure_fin: "10:00",
        },
        {
          id: 4,
          classe_id: 104, // 3ème
          matiere_id: 3,
          date_td: "2026-10-17",
          heure_debut: "08:00",
          heure_fin: "10:00",
        },
      ];

      const groupes = regrouperEtTrierCreneauxParClasse(creneaux, classesMap);

      // Ordre attendu :
      // 1. 6ème (niveau 1)
      // 2. 3ème (niveau 4)
      // 3. Terminale A (niveau 7, lettre A)
      // 4. Terminale D (niveau 7, lettre D)
      expect(groupes.map((g) => g.nomClasse)).toEqual([
        "6ème",
        "3ème",
        "Terminale A",
        "Terminale D",
      ]);
    });

    it("ordonne chronologiquement les créneaux d'une même classe", () => {
      const classesMap = new Map<number, ClasseMetadata>([
        [200, { id: 200, nom_classe: "Première CD", site_id: 1, ordre: 6 }],
      ]);

      const creneaux: CreneauDeBase[] = [
        {
          id: 21,
          classe_id: 200,
          matiere_id: 1,
          date_td: "2026-10-17",
          heure_debut: "14:00",
          heure_fin: "16:00",
        },
        {
          id: 20,
          classe_id: 200,
          matiere_id: 2,
          date_td: "2026-10-17",
          heure_debut: "08:00",
          heure_fin: "10:00",
        },
      ];

      const groupes = regrouperEtTrierCreneauxParClasse(creneaux, classesMap);
      expect(groupes).toHaveLength(1);
      expect(groupes[0].creneaux[0].heure_debut).toBe("08:00");
      expect(groupes[0].creneaux[1].heure_debut).toBe("14:00");
    });
  });
});
