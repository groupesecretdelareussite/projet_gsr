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
import { creerUtilisateur, desactiverUtilisateur, supprimerUtilisateur } from "./utilisateurs";

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

describe("Gestion utilisateurs — réservée au coordonnateur (§5.4/§8.9)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerUtilisateur",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

      await expect(
        creerUtilisateur({
          username: "testauto",
          email: "testauto@example.com",
          password: "motdepassetest123",
          role: "comptable",
        })
      ).rejects.toThrow("Non autorisé");
    }
  );
});

describe("Verrou auto-désactivation/auto-suppression", () => {
  it("desactiverUtilisateur refuse qu'un coordonnateur se désactive lui-même", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur", userId: "u1" }));

    const result = await desactiverUtilisateur("u1");
    expect(result.error).toBe("Vous ne pouvez pas désactiver votre propre compte");
  });

  it("supprimerUtilisateur refuse qu'un coordonnateur se supprime lui-même", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur", userId: "u1" }));

    const result = await supprimerUtilisateur("u1");
    expect(result.error).toBe("Vous ne pouvez pas supprimer votre propre compte");
  });
});
