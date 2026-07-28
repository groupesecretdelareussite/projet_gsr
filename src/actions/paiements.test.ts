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
import { enregistrerPaiement, supprimerPaiement } from "./paiements";

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

describe("enregistrerPaiement — garde de rôle (§8.7)", () => {
  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(
      enregistrerPaiement({
        eleveId: 1,
        moisSouscription: "Octobre",
        montantPaye: 1000,
        datePaiement: "2025-10-10",
        modePaiement: "Presentiel",
      })
    ).rejects.toThrow("Non autorisé");
  });
});

describe("supprimerPaiement — garde de rôle (interdit #4/#17)", () => {
  it("rejette le rôle superviseur — jamais de suppression, même s'il peut enregistrer", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "superviseur", isGlobal: false, siteIds: [1] }));

    await expect(supprimerPaiement(1, "motif", "password")).rejects.toThrow("Non autorisé");
  });

  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(supprimerPaiement(1, "motif", "password")).rejects.toThrow("Non autorisé");
  });
});
