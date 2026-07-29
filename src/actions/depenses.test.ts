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
import { creerDepense, modifierDepense, supprimerDepense, ajouterCategorie } from "./depenses";

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

const DEPENSE_VALIDE = { categorieId: 1, libelle: "Test", montant: 5000, dateDepense: "2026-11-05", anneeScolaireId: 1 };

describe("Comptabilité — réservée au coordonnateur et au comptable (§11)", () => {
  it.each(["superviseur", "chef_site", "secretaire"] as const)("rejette le rôle %s pour creerDepense", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
    await expect(creerDepense(DEPENSE_VALIDE)).rejects.toThrow("Non autorisé");
  });

  it.each(["superviseur", "chef_site", "secretaire"] as const)("rejette le rôle %s pour modifierDepense", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
    await expect(modifierDepense({ id: 1, categorieId: 1, libelle: "Test", montant: 5000, dateDepense: "2026-11-05" })).rejects.toThrow(
      "Non autorisé"
    );
  });

  it.each(["superviseur", "chef_site", "secretaire"] as const)("rejette le rôle %s pour supprimerDepense", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
    await expect(supprimerDepense(1)).rejects.toThrow("Non autorisé");
  });

  it.each(["superviseur", "chef_site", "secretaire"] as const)("rejette le rôle %s pour ajouterCategorie", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
    await expect(ajouterCategorie("Nouvelle catégorie")).rejects.toThrow("Non autorisé");
  });

  it("accepte le rôle comptable (pas seulement coordonnateur)", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "comptable" }));
    await expect(ajouterCategorie("")).resolves.toEqual({ error: "Le nom de la catégorie est requis" });
  });
});

describe("creerDepense — validation", () => {
  it.each([0, -100])("rejette un montant %s (doit être > 0)", async (montant) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));
    const result = await creerDepense({ ...DEPENSE_VALIDE, montant });
    expect(result.error).toBe("Le montant doit être supérieur à 0");
  });
});
