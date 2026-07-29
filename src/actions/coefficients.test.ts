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
import { definirCoefficient, supprimerCoefficient } from "./coefficients";

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

describe("Coefficients — réservé au coordonnateur", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour definirCoefficient",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(definirCoefficient(1, 1, 2)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerCoefficient",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerCoefficient(1, 1)).rejects.toThrow("Non autorisé");
    }
  );
});

describe("definirCoefficient — validation", () => {
  it.each([0, -1])("rejette un coefficient %s (doit être > 0)", async (coefficient) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const result = await definirCoefficient(1, 1, coefficient);
    expect(result.error).toBe("Le coefficient doit être supérieur à 0");
  });
});
