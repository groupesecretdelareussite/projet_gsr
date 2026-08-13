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
import { creerCreneauTD, supprimerCreneauTD, libererCreneauTD } from "./td-creneaux";

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

describe("Planning TD (créneaux) — réservé au coordonnateur (§10.3)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerCreneauTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerCreneauTD(CRENEAU_VALIDE)).rejects.toThrow("Non autorisé");
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
