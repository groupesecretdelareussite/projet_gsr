import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { QuittancePDF, type QuittanceData } from "./QuittancePDF";

describe("QuittancePDF", () => {
  const dataTest: QuittanceData = {
    eleveId: 101,
    numeroQuittance: "Q-2025-10-0001",
    nomComplet: "HOUEGBE Axel",
    matricule: "GSR-2025-001",
    college: "CEG Le Nokoué",
    nomClasse: "Terminale D",
    nomSite: "Jéricho",
    mois: "Octobre",
    anneeScolaire: "2025-2026",
    montantAttendu: 15000,
    datePaiement: "2025-10-05",
    modePaiement: "Présentiel",
    versements: [
      {
        id: 1,
        datePaiement: "2025-10-05",
        montantPaye: 15000,
        modePaiement: "Présentiel",
      },
    ],
  };

  it("génère avec succès un flux PDF sans lever d'exception", async () => {
    const docElement = React.createElement(QuittancePDF, {
      data: dataTest,
    }) as unknown as Parameters<typeof renderToStream>[0];

    const stream = await renderToStream(docElement);
    expect(stream).toBeDefined();

    let bytesCount = 0;
    stream.on("data", (chunk: Uint8Array) => {
      bytesCount += chunk.length;
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", (err: Error) => reject(err));
    });

    expect(bytesCount).toBeGreaterThan(1000);
  });

  it("gère les versements multiples pour un mois payé en plusieurs fois", async () => {
    const dataMultiVersements: QuittanceData = {
      ...dataTest,
      versements: [
        { id: 1, datePaiement: "2025-10-02", montantPaye: 10000, modePaiement: "Espèces" },
        { id: 2, datePaiement: "2025-10-10", montantPaye: 5000, modePaiement: "MoMo" },
      ],
    };

    const docElement = React.createElement(QuittancePDF, {
      data: dataMultiVersements,
    }) as unknown as Parameters<typeof renderToStream>[0];

    const stream = await renderToStream(docElement);
    let bytesCount = 0;
    stream.on("data", (chunk: Uint8Array) => {
      bytesCount += chunk.length;
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", (err: Error) => reject(err));
    });

    expect(bytesCount).toBeGreaterThan(1000);
  });

  it("génère avec succès une quittance multi-mois avec mois offerts", async () => {
    const dataMultiMois: QuittanceData = {
      eleveId: 101,
      numeroQuittance: "Q-M3-2025-10-0042",
      nomComplet: "HOUEGBE Axel",
      matricule: "GSR-2025-001",
      college: "CEG Le Nokoué",
      nomClasse: "Terminale D",
      nomSite: "Jéricho",
      mois: "Octobre - Decembre",
      anneeScolaire: "2025-2026",
      montantAttendu: 15000,
      montantTotal: 15000,
      estMultiMois: true,
      moisPayes: ["Octobre", "Novembre", "Decembre"],
      moisOfferts: ["Janvier"],
      versements: [
        { id: 42, datePaiement: "2025-10-05", montantPaye: 5000, modePaiement: "Présentiel", moisSouscription: "Octobre" },
        { id: 43, datePaiement: "2025-10-05", montantPaye: 5000, modePaiement: "Présentiel", moisSouscription: "Novembre" },
        { id: 44, datePaiement: "2025-10-05", montantPaye: 5000, modePaiement: "Présentiel", moisSouscription: "Decembre" },
        { id: 0, datePaiement: "2025-10-05", montantPaye: 0, modePaiement: "Promotion fidélité", moisSouscription: "Janvier", estOffert: true },
      ],
    };

    const docElement = React.createElement(QuittancePDF, {
      data: dataMultiMois,
    }) as unknown as Parameters<typeof renderToStream>[0];

    const stream = await renderToStream(docElement);
    let bytesCount = 0;
    stream.on("data", (chunk: Uint8Array) => {
      bytesCount += chunk.length;
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("end", () => resolve());
      stream.on("error", (err: Error) => reject(err));
    });

    expect(bytesCount).toBeGreaterThan(1000);
  });
});
