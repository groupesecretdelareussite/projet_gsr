import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { traiterArbitrageTD, affecterDirectementProfesseurTD } from "./td-arbitrage";

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

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour affecterDirectementProfesseurTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(affecterDirectementProfesseurTD(1, 1)).rejects.toThrow("Non autorisé");
    }
  );

  it("appelle la RPC affecter_directement_creneau quand le coordonnateur est authentifié", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      schema: vi.fn().mockReturnValue({ rpc: mockRpc }),
    } as never);
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));

    const res = await affecterDirectementProfesseurTD(5, 12);
    expect(res.error).toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith("affecter_directement_creneau", {
      p_creneau_id: 5,
      p_professeur_id: 12,
    });
  });
});
