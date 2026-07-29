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
import {
  creerZoneTD,
  modifierZoneTD,
  supprimerZoneTD,
  creerClasseTD,
  creerMatiereTD,
  creerProfesseurTD,
  reinitialiserMotDePasseProfTD,
  desactiverProfesseurTD,
} from "./td-config";

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

describe("Configuration TD — réservée au coordonnateur (§10.6)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerZoneTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerZoneTD("Zone test")).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour modifierZoneTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(modifierZoneTD(1, "Zone test")).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour supprimerZoneTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(supprimerZoneTD(1)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerClasseTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerClasseTD("6ème")).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerMatiereTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(creerMatiereTD("Francais")).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour creerProfesseurTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(
        creerProfesseurTD({
          nom: "Test",
          prenom: "Test",
          telephone: "0100000000",
          email: "test@exemple.com",
          motDePasse: "motdepasse123",
          zoneId: 1,
          matierePrincipaleId: 1,
        })
      ).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour reinitialiserMotDePasseProfTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(reinitialiserMotDePasseProfTD(1, "motdepasse123")).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour desactiverProfesseurTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(desactiverProfesseurTD(1)).rejects.toThrow("Non autorisé");
    }
  );
});
