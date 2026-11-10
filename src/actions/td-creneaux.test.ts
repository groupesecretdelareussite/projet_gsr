import { describe, it, expect, vi } from "vitest";
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
import { creerCreneauTD, modifierCreneauTD, supprimerCreneauTD, libererCreneauTD } from "./td-creneaux";

function makeScope(overrides: Partial<UserScope>): UserScope {
  return {
    userId: "u1",
    username: "test",
    role: "coordonnateur",
    siteId: null,
    siteIds: [],
    isGlobal: true,
    ...overrides,
  };
}

const CRENEAU_VALIDE = {
  semaineId: 1,
  classeId: 1,
  matiereId: 1,
  dateTd: "2026-11-04",
  heureDebut: "09:00",
  heureFin: "11:00",
  montantPrevu: 5000,
};

const MODIF_VALIDE = {
  creneauId: 1,
  classeId: 1,
  matiereId: 1,
  dateTd: "2026-11-04",
  heureDebut: "09:00",
  heureFin: "11:00",
  montantPrevu: 6000,
};

describe("Planning TD (créneaux) — réservé au coordonnateur (§10.3)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerCreneauTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerCreneauTD(CRENEAU_VALIDE)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour modifierCreneauTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(modifierCreneauTD(MODIF_VALIDE)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerCreneauTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerCreneauTD(1)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour libererCreneauTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(libererCreneauTD(1, "motif")).rejects.toThrow("Non autorisé");
    }
  );
});

describe("creerCreneauTD — validations pures", () => {
  it("rejette une heure de fin avant l'heure de début", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const result = await creerCreneauTD({ ...CRENEAU_VALIDE, heureDebut: "11:00", heureFin: "09:00" });
    expect(result.error).toBe("L'heure de fin doit être après l'heure de début.");
  });
});

describe("libererCreneauTD — validations pures (§discussion 2026-08-12)", () => {
  it("rejette un motif vide", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const result = await libererCreneauTD(1, "   ");
    expect(result.error).toBe("Un motif est requis.");
  });
});

describe("modifierCreneauTD — validations et règles métier", () => {
  it("rejette une heure de fin avant ou égale à l'heure de début", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const result = await modifierCreneauTD({ ...MODIF_VALIDE, heureDebut: "10:00", heureFin: "10:00" });
    expect(result.error).toBe("L'heure de fin doit être après l'heure de début.");
  });

  it("Question B : rejette si le créneau est déjà clôturé (prof validé)", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 1, semaine_id: 1, statut_creneau: "cloture" },
              }),
            }),
          }),
        }),
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockSupabase as any);

    const result = await modifierCreneauTD(MODIF_VALIDE);
    expect(result.error).toContain("déjà clôturé");
    expect(result.error).toContain("Libérer le créneau");
  });

  it("rejette si la semaine est clôturée", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "creneaux") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 1, semaine_id: 1, statut_creneau: "public" },
                  }),
                }),
              }),
            };
          }
          if (table === "semaines") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { statut: "cloturee", date_debut: "2026-11-02", date_fin: "2026-11-08" },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockSupabase as any);

    const result = await modifierCreneauTD(MODIF_VALIDE);
    expect(result.error).toContain("Cette semaine est déjà clôturée");
  });

  it("rejette si la date est hors de la semaine", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "creneaux") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 1, semaine_id: 1, statut_creneau: "public" },
                  }),
                }),
              }),
            };
          }
          if (table === "semaines") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { statut: "publiee", date_debut: "2026-11-02", date_fin: "2026-11-08" },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockSupabase as any);

    const result = await modifierCreneauTD({ ...MODIF_VALIDE, dateTd: "2026-11-15" });
    expect(result.error).toContain("comprise dans la semaine");
  });

  it("Question A : détecte un conflit d'agenda pour un candidat et demande confirmation", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "creneaux") {
            return {
              select: vi.fn((cols: string) => {
                if (cols.includes("statut_creneau")) {
                  return {
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 1, semaine_id: 1, statut_creneau: "public" },
                      }),
                    }),
                  };
                }
                if (cols.includes("matiere_id")) {
                  // Chevauchement classe
                  return {
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        neq: vi.fn().mockResolvedValue({ data: [] }),
                      }),
                    }),
                  };
                }
                // Créneaux validés ailleurs
                return {
                  in: vi.fn().mockResolvedValue({
                    data: [{ id: 99, date_td: "2026-11-04", heure_debut: "08:00:00", heure_fin: "10:00:00" }],
                  }),
                };
              }),
            };
          }
          if (table === "semaines") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { statut: "publiee", date_debut: "2026-11-02", date_fin: "2026-11-08" },
                  }),
                }),
              }),
            };
          }
          if (table === "postulations") {
            return {
              select: vi.fn((cols: string) => {
                if (cols.includes("professeurs")) {
                  // Candidatures en attente
                  return {
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockResolvedValue({
                        data: [{ id: 10, professeur_id: 42, professeurs: { nom: "DUPONT", prenom: "Jean" } }],
                      }),
                    }),
                  };
                }
                // Postulations validées ailleurs
                return {
                  in: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ professeur_id: 42, creneau_id: 99 }],
                    }),
                  }),
                };
              }),
            };
          }
          return {};
        }),
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockSupabase as any);

    // Nouvel horaire de 09:00 à 11:00 qui chevauche 08:00 à 10:00
    const result = await modifierCreneauTD(MODIF_VALIDE);
    expect(result.confirmationRequise).toBe(true);
    expect(result.candidatsEnConflit).toContain("Jean DUPONT");
    expect(result.messageConfirmation).toContain("conflit");
  });

  it("Question A : si forcerAnnulationCandidaturesSiConflit est true, supprime les candidatures et met à jour", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "creneaux") {
            return {
              select: vi.fn((cols: string) => {
                if (cols.includes("statut_creneau")) {
                  return {
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 1, semaine_id: 1, statut_creneau: "public" },
                      }),
                    }),
                  };
                }
                if (cols.includes("matiere_id")) {
                  return {
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockReturnValue({
                        neq: vi.fn().mockResolvedValue({ data: [] }),
                      }),
                    }),
                  };
                }
                return {
                  in: vi.fn().mockResolvedValue({
                    data: [{ id: 99, date_td: "2026-11-04", heure_debut: "08:00:00", heure_fin: "10:00:00" }],
                  }),
                };
              }),
              update: updateMock,
            };
          }
          if (table === "semaines") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { statut: "publiee", date_debut: "2026-11-02", date_fin: "2026-11-08" },
                  }),
                }),
              }),
            };
          }
          if (table === "postulations") {
            return {
              select: vi.fn((cols: string) => {
                if (cols.includes("professeurs")) {
                  return {
                    eq: vi.fn().mockReturnValue({
                      eq: vi.fn().mockResolvedValue({
                        data: [{ id: 10, professeur_id: 42, professeurs: { nom: "DUPONT", prenom: "Jean" } }],
                      }),
                    }),
                  };
                }
                return {
                  in: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ professeur_id: 42, creneau_id: 99 }],
                    }),
                  }),
                };
              }),
              delete: deleteMock,
            };
          }
          return {};
        }),
      }),
    };
    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockSupabase as any);

    const result = await modifierCreneauTD({
      ...MODIF_VALIDE,
      forcerAnnulationCandidaturesSiConflit: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.confirmationRequise).toBeUndefined();
    expect(deleteMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });
});
