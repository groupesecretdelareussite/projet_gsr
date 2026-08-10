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
import { creerSemaineTD, publierSemaineTD, cloturerSemaineTD, modifierSemaineTD, supprimerSemaineTD } from "./td-semaines";

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

describe("Planning TD (semaines) — réservé au coordonnateur (§10.3)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerSemaineTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerSemaineTD({ libelle: "Semaine test", dateDebut: "2026-11-04" })).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour publierSemaineTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(publierSemaineTD(1)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour cloturerSemaineTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(cloturerSemaineTD(1)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour modifierSemaineTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(modifierSemaineTD({ id: 1, libelle: "Semaine test", dateDebut: "2026-11-02" })).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerSemaineTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerSemaineTD(1)).rejects.toThrow("Non autorisé");
    }
  );
});

describe("creerSemaineTD — validation lundi (§12.8)", () => {
  it("rejette une date de début qui n'est pas un lundi", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    // 2026-11-05 est un jeudi
    const result = await creerSemaineTD({ libelle: "Semaine test", dateDebut: "2026-11-05" });
    expect(result.error).toBe("La date de début doit être un lundi");
  });
});

describe("modifierSemaineTD — validation lundi (§12.8)", () => {
  it("rejette une date de début qui n'est pas un lundi", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    // 2026-11-05 est un jeudi
    const result = await modifierSemaineTD({ id: 1, libelle: "Semaine test", dateDebut: "2026-11-05" });
    expect(result.error).toBe("La date de début doit être un lundi");
  });
});
