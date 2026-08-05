import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { uploaderPhotoGalerieAdmin, supprimerPhotoGalerieAdmin } from "./galerie-admin";

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

describe("Galerie admin — réservée à coordonnateur/comptable/superviseur", () => {
  it.each(["chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour uploaderPhotoGalerieAdmin",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(uploaderPhotoGalerieAdmin(new FormData())).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerPhotoGalerieAdmin",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerPhotoGalerieAdmin(1, "path.jpg")).rejects.toThrow("Non autorisé");
    }
  );
});
