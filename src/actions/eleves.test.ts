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
import { suspendreEleve, inscrireEleve } from "./eleves";

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

describe("suspendreEleve — garde de rôle (interdit #18)", () => {
  it("rejette le rôle chef_site — ne peut jamais suspendre un élève", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", isGlobal: false, siteId: 1 }));

    await expect(suspendreEleve(1, "maladie", "motif")).rejects.toThrow("Non autorisé");
  });

  it("rejette le rôle secretaire", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", isGlobal: false }));

    await expect(suspendreEleve(1, "maladie", "motif")).rejects.toThrow("Non autorisé");
  });
});

describe("inscrireEleve — garde de rôle", () => {
  it("rejette le rôle chef_site — ne peut pas inscrire d'élève", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", isGlobal: false, siteId: 1 }));

    await expect(
      inscrireEleve({
        nom: "TESTAUTO",
        prenoms: "Test",
        contactParent: "+22900000000",
        classeId: 1,
        college: "COLLEGE TEST",
      })
    ).rejects.toThrow("Non autorisé");
  });
});
