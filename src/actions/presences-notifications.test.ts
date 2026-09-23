import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { enregistrerAppelDuJour } from "./presences";

function makeScope(overrides: Partial<UserScope>): UserScope {
  return {
    userId: "u-staff",
    username: "secretaire1",
    role: "secretaire",
    siteId: 1,
    siteIds: [],
    isGlobal: false,
    ...overrides,
  };
}

describe("Notification d'assiduité (Absences répétées — Option A : 2 absences dans le même mois)", () => {
  let mockServerClient: any;
  let mockAdminClient: any;
  let notificationsInserees: any[] = [];

  beforeEach(() => {
    notificationsInserees = [];
    vi.mocked(getUserScope).mockResolvedValue(makeScope({ role: "secretaire", siteId: 1 }));

    // Mock du client server (pour appelExistant et upsert presences)
    mockServerClient = {
      from: vi.fn((table: string) => {
        if (table === "presences") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: [] })), // aucun appel existant
                })),
              })),
            })),
            upsert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        return {};
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockServerClient);
  });

  it("génère une notification ciblée lorsqu'un élève absent atteint exactement 2 absences dans le mois", async () => {
    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "presences") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      // L'élève 1 a 2 absences comptabilisées sur le mois
                      Promise.resolve({ data: [{ eleve_id: 1 }, { eleve_id: 1 }] })
                    ),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 1,
                      nom: "KOUASSI",
                      prenoms: "Jean",
                      matricule: "Y10241234",
                      classes: { nom_classe: "6ème A" },
                    },
                  ],
                })
              ),
            })),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any[]) => {
              notificationsInserees = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdminClient);

    const result = await enregistrerAppelDuJour({
      datePresence: "2026-09-23",
      siteId: 1,
      classeId: 10,
      anneeScolaireId: 1,
      presences: [
        { eleveId: 1, present: false }, // absent aujourd'hui
        { eleveId: 2, present: true },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(notificationsInserees).toHaveLength(1);

    const notif = notificationsInserees[0];
    expect(notif.site_id).toBe(1);
    expect(notif.contenu).toContain("Alerte assiduité");
    expect(notif.contenu).toContain("KOUASSI Jean");
    expect(notif.contenu).toContain("6ème A");
    expect(notif.contenu).toContain("Y10241234");
    expect(notif.contenu).toContain("2 absences");
    expect(notif.contenu).toContain("Septembre");

    // Destinataires strictement définis
    expect(notif.roles_cibles).toEqual(["coordonnateur", "superviseur", "chef_site"]);
    expect(notif.roles_cibles).not.toContain("comptable");
    expect(notif.roles_cibles).not.toContain("secretaire");
  });

  it("ne génère AUCUNE notification lors de la 1ère absence du mois (total = 1)", async () => {
    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "presences") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      // Seulement 1 absence dans le mois
                      Promise.resolve({ data: [{ eleve_id: 1 }] })
                    ),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any[]) => {
              notificationsInserees = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdminClient);

    const result = await enregistrerAppelDuJour({
      datePresence: "2026-09-23",
      siteId: 1,
      classeId: 10,
      anneeScolaireId: 1,
      presences: [{ eleveId: 1, present: false }],
    });

    expect(result.error).toBeUndefined();
    expect(notificationsInserees).toHaveLength(0);
  });

  it("ne génère AUCUNE notification lors de la 3ème absence du mois (Option A : seuil atteint seulement à 2)", async () => {
    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "presences") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    lte: vi.fn(() =>
                      // 3 absences dans le mois (déjà notifié lors de la 2ème)
                      Promise.resolve({ data: [{ eleve_id: 1 }, { eleve_id: 1 }, { eleve_id: 1 }] })
                    ),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any[]) => {
              notificationsInserees = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdminClient);

    const result = await enregistrerAppelDuJour({
      datePresence: "2026-09-23",
      siteId: 1,
      classeId: 10,
      anneeScolaireId: 1,
      presences: [{ eleveId: 1, present: false }],
    });

    expect(result.error).toBeUndefined();
    expect(notificationsInserees).toHaveLength(0);
  });
});
