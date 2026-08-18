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
import { payerRecompensesEleve, toutPayerRecompenses } from "./recompenses";

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

describe("Récompenses — Gardes de rôle", () => {
  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s pour payerRecompensesEleve", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(
      payerRecompensesEleve({
        eleveId: 1,
        mois: "Octobre",
        anneeScolaireId: 1,
        notes: [{ noteId: 10, typeGain: "interro", montant: 200 }],
      })
    ).rejects.toThrow("Non autorisé");
  });

  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s pour toutPayerRecompenses", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(
      toutPayerRecompenses({
        mois: "Octobre",
        anneeScolaireId: 1,
        eleves: [],
      })
    ).rejects.toThrow("Non autorisé");
  });
});
