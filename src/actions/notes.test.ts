import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { upsertNote } from "./notes";

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

describe("upsertNote — secretaire aligné sur chef_site (§discussion 2026-08-15)", () => {
  it("n'exclut plus le rôle secretaire (passe la garde de rôle)", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", siteId: 1, isGlobal: false }));

    const result = await upsertNote({ eleveId: 1, matiereId: 1, typeNote: "I1", valeur: -1, anneeScolaireId: 1, semestre: 1 });
    expect(result.error).toBe("La note doit être comprise entre 0 et 20");
  });
});

describe("upsertNote — validation de la plage 0-20", () => {
  it.each([-1, 20.5, 21])("rejette la valeur %s sans appeler Supabase", async (valeur) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", siteId: 1, isGlobal: false }));

    const result = await upsertNote({ eleveId: 1, matiereId: 1, typeNote: "I1", valeur, anneeScolaireId: 1, semestre: 1 });
    expect(result.error).toBe("La note doit être comprise entre 0 et 20");
  });
});
