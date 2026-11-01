import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { regulariserSuspension } from "./regulariser-suspension";

function makeScope(overrides: Partial<UserScope>): UserScope {
  return {
    userId: "u1-admin",
    username: "admin_test",
    role: "coordonnateur",
    siteId: null,
    siteIds: [],
    isGlobal: true,
    ...overrides,
  };
}

describe("regulariserSuspension — Garde de rôle & Autorisations", () => {
  it.each(["chef_site", "secretaire"] as const)("rejette le rôle non autorisé %s", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(
      regulariserSuspension({
        eleveId: 10,
        montantVerse: 10000,
        datePaiement: "2026-10-31",
        modePaiement: "MoMo",
      })
    ).rejects.toThrow("Non autorisé");
  });

  it("rejette un superviseur dont le site n'englobe pas l'élève", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(
      makeScope({ role: "superviseur", isGlobal: false, siteIds: [99] })
    );

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 10,
                      nom: "Dossou",
                      prenoms: "Koffi",
                      matricule: "MAT-01",
                      statut: "suspendu",
                      classe_id: 1,
                      classes: { site_id: 2, nom_classe: "3ème A" },
                    },
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockAdmin as any);

    const result = await regulariserSuspension({
      eleveId: 10,
      montantVerse: 5000,
      datePaiement: "2026-10-31",
      modePaiement: "MoMo",
    });

    expect(result.error).toContain("Non autorisé sur le site");
  });
});

describe("regulariserSuspension — Validation des paramètres d'entrée", () => {
  beforeEach(() => {
    vi.mocked(getUserScope).mockResolvedValue(makeScope({ role: "comptable" }));
  });

  it("rejette un montant négatif ou égal à zéro", async () => {
    const resZero = await regulariserSuspension({
      eleveId: 10,
      montantVerse: 0,
      datePaiement: "2026-10-31",
      modePaiement: "MoMo",
    });
    expect(resZero.error).toContain("strictement positif");

    const resNegatif = await regulariserSuspension({
      eleveId: 10,
      montantVerse: -500,
      datePaiement: "2026-10-31",
      modePaiement: "MoMo",
    });
    expect(resNegatif.error).toContain("strictement positif");
  });

  it("rejette un format de date invalide", async () => {
    const res = await regulariserSuspension({
      eleveId: 10,
      montantVerse: 5000,
      datePaiement: "31/10/2026",
      modePaiement: "MoMo",
    });
    expect(res.error).toContain("Date de paiement invalide");
  });
});

describe("regulariserSuspension — Les 3 Cas Métier", () => {
  const mockEleve = {
    id: 10,
    nom: "Houegbe",
    prenoms: "Axel",
    matricule: "GSR-2026-001",
    statut: "suspendu",
    classe_id: 3,
    classes: { site_id: 1, nom_classe: "Terminale D" },
  };

  const mockSuspension = {
    id: 100,
    raison: "defaut_paiement",
    motif: "Defaut de paiement — 15000 F restants pour le mois de Octobre",
    montant_du: 15000,
    mois_souscription: "Octobre",
    annee_scolaire_id: 1,
  };

  const mockFraisTd = {
    montant: 15000,
  };

  beforeEach(() => {
    vi.mocked(getUserScope).mockResolvedValue(makeScope({ role: "coordonnateur" }));
  });

  it("Cas 1 : bloque et rejette le versement si montantVerse + dejaPaye > fraisAttendus", async () => {
    // Éleve avec 15000 F de scolarité, 5000 F déjà payés (reste dû = 10000 F).
    // On essaie de verser 12000 F -> Dépassement de 2000 F interdit !
    const mockPaiementsExistants = [{ montant_paye: 5000 }];

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockEleve, error: null })),
              })),
            })),
          };
        }
        if (table === "eleves_suspendus") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockSuspension, error: null })),
              })),
            })),
          };
        }
        if (table === "frais_td") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockFraisTd, error: null })),
              })),
            })),
          };
        }
        if (table === "paiements") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              then: (cb: any) => Promise.resolve({ data: mockPaiementsExistants, error: null }).then(cb),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdmin as any);

    const result = await regulariserSuspension({
      eleveId: 10,
      montantVerse: 12000,
      datePaiement: "2026-10-31",
      modePaiement: "MoMo",
    });

    expect(result.categorie).toBe("depassement");
    expect(result.error).toContain("dépasse le reste dû");
    expect(result.error).toContain("Aucun dépassement n'est autorisé");
  });

  it("Cas 2 : solde complet -> enregistre paiement, supprime suspension, rétablit actif", async () => {
    // 0 F déjà payés, frais = 15000 F, versement = 15000 F -> Solde à 100%
    const mockPaiementsExistants: any[] = [];
    let insertedPaiement: any = null;
    let deletedSuspensionEleveId: any = null;
    let updatedEleveStatut: any = null;
    let insertedNotification: any = null;

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockEleve, error: null })),
              })),
            })),
            update: vi.fn((payload: any) => ({
              eq: vi.fn((_col: string, id: number) => {
                updatedEleveStatut = payload.statut;
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        if (table === "eleves_suspendus") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockSuspension, error: null })),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn((_col: string, id: number) => {
                deletedSuspensionEleveId = id;
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        if (table === "frais_td") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockFraisTd, error: null })),
              })),
            })),
          };
        }
        if (table === "paiements") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              then: (cb: any) => Promise.resolve({ data: mockPaiementsExistants, error: null }).then(cb),
            })),
            insert: vi.fn((payload: any) => {
              insertedPaiement = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any) => {
              insertedNotification = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdmin as any);

    const result = await regulariserSuspension({
      eleveId: 10,
      montantVerse: 15000,
      datePaiement: "2026-10-31",
      modePaiement: "MoMo",
    });

    expect(result.error).toBeUndefined();
    expect(result.categorie).toBe("solde_complet");
    expect(result.nouveauStatut).toBe("actif");
    expect(result.nouveauResteDu).toBe(0);

    // Vérifications d'intégrité
    expect(insertedPaiement).toEqual({
      eleve_id: 10,
      mois_souscription: "Octobre",
      montant_paye: 15000,
      date_paiement: "2026-10-31",
      mode_paiement: "MoMo",
      annee_scolaire_id: 1,
      enregistre_par: "u1-admin",
    });
    expect(deletedSuspensionEleveId).toBe(10);
    expect(updatedEleveStatut).toBe("actif");
    expect(insertedNotification.contenu).toContain("levée de la suspension");
  });

  it("Cas 3 : acompte partiel -> enregistre paiement, met à jour dette, maintient suspendu", async () => {
    // Frais = 15000 F, 0 F déjà payés, versement = 6000 F -> Reste 9000 F
    const mockPaiementsExistants: any[] = [];
    let insertedPaiement: any = null;
    let updatedSuspension: any = null;
    let insertedNotification: any = null;

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockEleve, error: null })),
              })),
            })),
          };
        }
        if (table === "eleves_suspendus") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockSuspension, error: null })),
              })),
            })),
            update: vi.fn((payload: any) => ({
              eq: vi.fn((_col: string, _id: number) => {
                updatedSuspension = payload;
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        if (table === "frais_td") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockFraisTd, error: null })),
              })),
            })),
          };
        }
        if (table === "paiements") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              then: (cb: any) => Promise.resolve({ data: mockPaiementsExistants, error: null }).then(cb),
            })),
            insert: vi.fn((payload: any) => {
              insertedPaiement = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any) => {
              insertedNotification = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdmin as any);

    const result = await regulariserSuspension({
      eleveId: 10,
      montantVerse: 6000,
      datePaiement: "2026-10-31",
      modePaiement: "MoMo",
    });

    expect(result.error).toBeUndefined();
    expect(result.categorie).toBe("acompte_partiel");
    expect(result.nouveauStatut).toBe("suspendu");
    expect(result.nouveauResteDu).toBe(9000);

    // Vérifications d'intégrité
    expect(insertedPaiement.montant_paye).toBe(6000);
    expect(updatedSuspension).toEqual({
      montant_du: 9000,
      motif: "Defaut de paiement — 9000 F restants pour le mois de Octobre",
    });
    expect(insertedNotification.contenu).toContain("acompte de");
    expect(insertedNotification.contenu).toContain("Houegbe Axel");
    expect(insertedNotification.contenu).toContain("nouveau reste dû pour Octobre");
  });
});

describe("getElevesSuspendusDefautPaiement", () => {
  it.each(["chef_site", "secretaire"] as const)("rejette le rôle non autorisé %s", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    const { getElevesSuspendusDefautPaiement } = await import("./regulariser-suspension");
    const result = await getElevesSuspendusDefautPaiement();
    expect(result.error).toBe("Non autorisé");
  });

  it("retourne une liste vide si aucune année scolaire active", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "comptable" }));

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "annees_scolaires") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockAdmin as any);

    const { getElevesSuspendusDefautPaiement } = await import("./regulariser-suspension");
    const result = await getElevesSuspendusDefautPaiement();
    expect(result.data).toEqual([]);
  });
});

