import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { createClient } from "@/lib/supabase/server";
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

describe("Galerie admin — accès ouvert aux 5 rôles depuis le 2026-08-16 (§discussion)", () => {
  it.each(["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "n'exclut plus le rôle %s pour uploaderPhotoGalerieAdmin (passe la garde de rôle)",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      const result = await uploaderPhotoGalerieAdmin(new FormData());
      expect(result.error).toBe("Aucun fichier sélectionné");
    }
  );
});

describe("supprimerPhotoGalerieAdmin — suppression limitée au propriétaire pour chef_site/secretaire", () => {
  it.each(["chef_site", "secretaire"] as const)("%s peut supprimer sa propre photo", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, userId: "u1", isGlobal: false }));
    vi.mocked(createClient).mockResolvedValue({
      from: (table: string) => {
        if (table === "galerie_admin") {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { ajoute_par: "u1" }, error: null }) }) }),
            delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
          };
        }
        throw new Error(`table inattendue : ${table}`);
      },
      storage: { from: () => ({ remove: () => Promise.resolve({ error: null }) }) },
    } as never);

    const result = await supprimerPhotoGalerieAdmin(1, "path.jpg");
    expect(result).toEqual({});
  });

  it.each(["chef_site", "secretaire"] as const)("%s ne peut pas supprimer la photo de quelqu'un d'autre", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, userId: "u1", isGlobal: false }));
    vi.mocked(createClient).mockResolvedValue({
      from: (table: string) => {
        if (table === "galerie_admin") {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { ajoute_par: "u2" }, error: null }) }) }) };
        }
        throw new Error(`table inattendue : ${table}`);
      },
    } as never);

    const result = await supprimerPhotoGalerieAdmin(1, "path.jpg");
    expect(result.error).toBe("Vous ne pouvez supprimer que vos propres photos");
  });

  it("coordonnateur peut supprimer n'importe quelle photo, sans vérification de propriétaire", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const deleteMock = vi.fn(() => ({ eq: () => Promise.resolve({ error: null }) }));
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({ delete: deleteMock }),
      storage: { from: () => ({ remove: () => Promise.resolve({ error: null }) }) },
    } as never);

    const result = await supprimerPhotoGalerieAdmin(1, "path.jpg");
    expect(result).toEqual({});
    expect(deleteMock).toHaveBeenCalled();
  });
});
