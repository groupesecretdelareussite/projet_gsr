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
import { creerActualite, modifierActualite, supprimerImageActualite, supprimerActualite } from "./actualites";

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

describe("Actualités — réservé au coordonnateur", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerActualite",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerActualite(new FormData())).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour modifierActualite",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(modifierActualite(1, new FormData())).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerImageActualite",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerImageActualite(1)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerActualite",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerActualite(1)).rejects.toThrow("Non autorisé");
    }
  );
});

describe("creerActualite — validation", () => {
  it("rejette un formulaire sans image", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const formData = new FormData();
    formData.set("titre", "Titre test");
    formData.set("categorie", "Cours");
    formData.set("extrait", "Extrait test");
    formData.set("contenu", "Contenu test");
    formData.set("statut", "brouillon");

    const result = await creerActualite(formData);
    expect(result.error).toBe("Au moins une image est requise");
  });

  it("rejette un formulaire incomplet", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const formData = new FormData();
    formData.set("titre", "");

    const result = await creerActualite(formData);
    expect(result.error).toBe("Tous les champs sont requis");
  });
});
