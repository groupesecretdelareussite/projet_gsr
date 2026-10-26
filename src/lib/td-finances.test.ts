import { describe, it, expect } from "vitest";
import {
  getStatutFenetreRetrait,
  MONTANT_MINIMUM_RETRAIT,
  RESEAUX_MOMO,
  genererMessageWhatsAppReclamation,
  genererLienReclamationPaiementWhatsApp,
} from "./td-finances";

describe("Logique financière & Retraits TD (td-finances)", () => {
  it("vérifie que le montant minimum de retrait est fixé à 5 000 F CFA", () => {
    expect(MONTANT_MINIMUM_RETRAIT).toBe(5000);
  });

  it("supporte les 3 réseaux béninois : MTN, Moov et Celtis", () => {
    expect(RESEAUX_MOMO.mtn.label).toBe("MTN Mobile Money");
    expect(RESEAUX_MOMO.moov.label).toBe("Moov Money");
    expect(RESEAUX_MOMO.celtis.label).toBe("Celtis Cash (Celtis Bénin)");
  });

  describe("Calcul de la fenêtre de retrait (28 au dernier jour du mois)", () => {
    it("détecte la fenêtre fermée entre le 1er et le 27 du mois", () => {
      // 15 Octobre 2026
      const date15Oct = new Date(2026, 9, 15);
      const res = getStatutFenetreRetrait(date15Oct);

      expect(res.estOuverte).toBe(false);
      expect(res.jour).toBe(15);
      expect(res.dernierJour).toBe(31); // Octobre a 31 jours
      expect(res.moisFormat).toBe("2026-10");
      expect(res.prochaineOuvertureLibelle).toContain("28");
    });

    it("détecte la fenêtre ouverte à partir du 28 sur un mois de 31 jours (Octobre)", () => {
      // 28 Octobre 2026
      const date28Oct = new Date(2026, 9, 28);
      const res = getStatutFenetreRetrait(date28Oct);

      expect(res.estOuverte).toBe(true);
      expect(res.jour).toBe(28);
      expect(res.dernierJour).toBe(31);
      expect(res.moisFormat).toBe("2026-10");
    });

    it("détecte la fenêtre ouverte le 30 sur un mois de 30 jours (Novembre)", () => {
      // 30 Novembre 2026
      const date30Nov = new Date(2026, 10, 30);
      const res = getStatutFenetreRetrait(date30Nov);

      expect(res.estOuverte).toBe(true);
      expect(res.jour).toBe(30);
      expect(res.dernierJour).toBe(30);
      expect(res.moisFormat).toBe("2026-11");
    });

    it("gère correctement le mois de Février (28 jours)", () => {
      // 28 Février 2027
      const date28Fev = new Date(2027, 1, 28);
      const res = getStatutFenetreRetrait(date28Fev);

      expect(res.estOuverte).toBe(true);
      expect(res.dernierJour).toBe(28);
      expect(res.moisFormat).toBe("2027-02");
    });
  });

  describe("Génération du message d'assistance WhatsApp", () => {
    it("génère un message complet avec référence MoMo pour un paiement payé", () => {
      const msg = genererMessageWhatsAppReclamation({
        codeDemande: "PAY-202610-001",
        montant: 50000,
        nomProf: "Jean DUPONT",
        reseau: "celtis",
        numeroMomo: "40123456",
        statut: "paye",
        referencePaiement: "CEL-9382019",
      });

      expect(msg).toContain("#PAY-202610-001");
      expect(msg).toContain("50\u202f000 F CFA");
      expect(msg).toContain("CEL-9382019");
      expect(msg).toContain("Celtis Cash");
      expect(msg).toContain("40123456");
      expect(msg).toContain("Jean DUPONT");
    });

    it("génère un message sans référence de transfert pour une demande encore en attente", () => {
      const msg = genererMessageWhatsAppReclamation({
        codeDemande: "PAY-202610-002",
        montant: 25000,
        nomProf: "Paul KOFFI",
        reseau: "mtn",
        numeroMomo: "97000000",
        statut: "en_attente",
      });

      expect(msg).toContain("#PAY-202610-002");
      expect(msg).toContain("25\u202f000 F CFA");
      expect(msg).toContain("en attente de traitement");
      expect(msg).not.toContain("CEL-");
      expect(msg).not.toContain("référence opérateur");
    });

    it("génère une URL WhatsApp valide", () => {
      const lien = genererLienReclamationPaiementWhatsApp({
        codeDemande: "PAY-202610-001",
        montant: 50000,
        reseau: "moov",
        numeroMomo: "95000000",
        statut: "paye",
        referencePaiement: "MP-12345",
      });

      expect(lien.startsWith("https://wa.me/")).toBe(true);
      expect(lien).toContain(encodeURIComponent("#PAY-202610-001"));
    });
  });
});
