import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { traiterArbitrageTD } from "./td-arbitrage";

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

describe("Arbitrage TD — réservé au coordonnateur (§10.4/§12.6)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour traiterArbitrageTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(traiterArbitrageTD(1, 1)).rejects.toThrow("Non autorisé");
    }
  );
});
