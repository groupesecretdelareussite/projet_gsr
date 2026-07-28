import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { upsertPresence, marquerTousPresence } from "./presences";

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

describe("Présences — accessible à tous sauf secretaire (§4/§8.6)", () => {
  it("rejette le rôle secretaire pour upsertPresence", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", isGlobal: false }));

    await expect(
      upsertPresence({ eleveId: 1, datePresence: "2026-07-28", siteId: 1, classeId: 1, anneeScolaireId: 1, present: true })
    ).rejects.toThrow("Non autorisé");
  });

  it("rejette le rôle secretaire pour marquerTousPresence", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", isGlobal: false }));

    await expect(
      marquerTousPresence({
        eleveIds: [1, 2],
        datePresence: "2026-07-28",
        siteId: 1,
        classeId: 1,
        anneeScolaireId: 1,
        present: true,
      })
    ).rejects.toThrow("Non autorisé");
  });
});
