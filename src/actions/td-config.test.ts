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
  creerMatiereTD,
  creerProfesseurTD,
  reinitialiserMotDePasseProfTD,
  desactiverProfesseurTD,
  validerProfesseurTD,
  refuserProfesseurTD,
  inscrireProfesseurTD,
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

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour validerProfesseurTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(validerProfesseurTD(1)).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour refuserProfesseurTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(refuserProfesseurTD(1)).rejects.toThrow("Non autorisé");
    }
  );
});

describe("Inscriptions professeurs en autonomie (inscrireProfesseurTD)", () => {
  it("rejette un mot de passe trop court (< 8 caractères)", async () => {
    const res = await inscrireProfesseurTD({
      nom: "Dupont",
      prenom: "Jean",
      telephone: "+2290197000000",
      email: "jean.dupont@test.com",
      motDePasse: "court",
      zoneId: 1,
      matierePrincipaleId: 1,
    });
    expect(res.error).toBe("Le mot de passe doit contenir au moins 8 caractères");
  });

  it("rejette une adresse email mal formatée", async () => {
    const res = await inscrireProfesseurTD({
      nom: "Dupont",
      prenom: "Jean",
      telephone: "+2290197000000",
      email: "email-invalide",
      motDePasse: "motdepasse123",
      zoneId: 1,
      matierePrincipaleId: 1,
    });
    expect(res.error).toBe("Adresse email invalide");
  });

  it("rejette un numéro béninois au mauvais format", async () => {
    const res = await inscrireProfesseurTD({
      nom: "Dupont",
      prenom: "Jean",
      telephone: "+22912345",
      email: "jean.dupont@test.com",
      motDePasse: "motdepasse123",
      zoneId: 1,
      matierePrincipaleId: 1,
    });
    expect(res.error).toContain("Numéro béninois invalide");
  });
});
