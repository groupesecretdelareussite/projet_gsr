import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { reinscrireEleve } from "./eleves";
import { supprimerPaiement } from "./paiements";

function makeScope(overrides: Partial<UserScope>): UserScope {
  return {
    userId: "u1",
    username: "coord1",
    role: "coordonnateur",
    siteId: 1,
    siteIds: [],
    isGlobal: true,
    ...overrides,
  };
}

describe("Notifications ciblées — Réinscription d'un élève", () => {
  let notificationsInserees: any[] = [];

  beforeEach(() => {
    notificationsInserees = [];
    vi.mocked(getUserScope).mockResolvedValue(makeScope({ role: "coordonnateur", isGlobal: true }));
    vi.mocked(createClient).mockResolvedValue({} as any);
  });

  it("génère une notification ciblée pour Coordonnateur, Superviseur, Comptable et Chef de site (Secrétaire exclu)", async () => {
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 10,
                      statut: "suspendu",
                      nom: "TRAORE",
                      prenoms: "Fatou",
                      matricule: "Y10245678",
                      classes: { site_id: 1, nom_classe: "3ème B" },
                    },
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === "eleves_suspendus") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      raison: "discipline",
                      montant_du: 0,
                      mois_souscription: null,
                      annee_scolaire_id: 1,
                    },
                  })
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === "penalites_reinscription") {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any) => {
              if (Array.isArray(payload)) {
                notificationsInserees.push(...payload);
              } else {
                notificationsInserees.push(payload);
              }
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdminClient as any);

    const result = await reinscrireEleve(10, {
      datePaiement: "2026-09-23",
      modePaiement: "Presentiel",
    });

    expect(result.error).toBeUndefined();
    expect(notificationsInserees).toHaveLength(1);

    const notif = notificationsInserees[0];
    expect(notif.site_id).toBe(1);
    expect(notif.contenu).toContain("Réinscription");
    expect(notif.contenu).toContain("TRAORE Fatou");
    expect(notif.contenu).toContain("Y10245678");
    expect(notif.contenu).toContain("3ème B");

    // Vérification stricte des destinataires : coordonnateur, comptable, superviseur, chef_site
    expect(notif.roles_cibles).toEqual(["coordonnateur", "comptable", "superviseur", "chef_site"]);
    expect(notif.roles_cibles).not.toContain("secretaire");
  });
});

describe("Notifications ciblées — Suppression d'un paiement", () => {
  let notificationsInserees: any[] = [];

  beforeEach(() => {
    notificationsInserees = [];
    vi.mocked(getUserScope).mockResolvedValue(
      makeScope({ role: "coordonnateur", username: "coord1", isGlobal: true })
    );

    const mockAuthClient = {
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { email: "coord@gsr.ci" } }, error: null })
        ),
        signInWithPassword: vi.fn(() => Promise.resolve({ error: null })),
      },
    };
    vi.mocked(createClient).mockResolvedValue(mockAuthClient as any);
  });

  it("génère une notification ciblée UNIQUEMENT pour Coordonnateur et Comptable", async () => {
    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === "paiements") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      id: 99,
                      mois_souscription: "Octobre",
                      montant_paye: 25000,
                      date_paiement: "2026-09-10",
                      mode_paiement: "Especes",
                      eleves: {
                        nom: "KONE",
                        prenoms: "Bakary",
                        matricule: "Y10249999",
                        classes: { site_id: 2 },
                      },
                    },
                  })
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === "paiements_supprimes") {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn((payload: any) => {
              if (Array.isArray(payload)) {
                notificationsInserees.push(...payload);
              } else {
                notificationsInserees.push(payload);
              }
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockAdminClient as any);

    const result = await supprimerPaiement(99, "Erreur de saisie", "valid-password");

    expect(result.error).toBeUndefined();
    expect(notificationsInserees).toHaveLength(1);

    const notif = notificationsInserees[0];
    expect(notif.site_id).toBe(2);
    expect(notif.contenu).toContain("Paiement supprimé");
    expect(notif.contenu).toContain("25 000 F"); // formaté fr-FR
    expect(notif.contenu).toContain("Octobre");
    expect(notif.contenu).toContain("KONE Bakary");
    expect(notif.contenu).toContain("Y10249999");
    expect(notif.contenu).toContain("coord1");
    expect(notif.contenu).toContain("Erreur de saisie");

    // Destinataires strictement Coordonnateur et Comptable
    expect(notif.roles_cibles).toEqual(["coordonnateur", "comptable"]);
    expect(notif.roles_cibles).not.toContain("superviseur");
    expect(notif.roles_cibles).not.toContain("chef_site");
    expect(notif.roles_cibles).not.toContain("secretaire");
  });
});
