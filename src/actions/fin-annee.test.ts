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
import { demarrerRevueFinAnnee, annulerRevueFinAnnee, enregistrerDecisionPassage, validerFinAnnee } from "./fin-annee";

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

describe("Fin d'année — réservée au coordonnateur (§8.10/§12.9)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour demarrerRevueFinAnnee",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(demarrerRevueFinAnnee()).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour annulerRevueFinAnnee",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(annulerRevueFinAnnee()).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour enregistrerDecisionPassage",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(enregistrerDecisionPassage({ eleveId: 1, decision: "redouble" })).rejects.toThrow("Non autorisé");
    }
  );

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour validerFinAnnee",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      await expect(
        validerFinAnnee({ libelle: "2027-2028", dateDebut: "2027-10-01", dateFin: "2028-05-31" })
      ).rejects.toThrow("Non autorisé");
    }
  );
});

describe("enregistrerDecisionPassage — validations", () => {
  it("refuse une décision invalide", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const result = await enregistrerDecisionPassage({ eleveId: 1, decision: "invalide" as never });
    expect(result.error).toBe("Décision invalide");
  });

  it("exige une classe de destination pour une décision 'passe'", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const result = await enregistrerDecisionPassage({ eleveId: 1, decision: "passe" });
    expect(result.error).toBe("Classe de destination requise");
  });
});

describe("validerFinAnnee — validations", () => {
  it("refuse un libellé vide", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const result = await validerFinAnnee({ libelle: "  ", dateDebut: "2027-10-01", dateFin: "2028-05-31" });
    expect(result.error).toBe("Libellé requis");
  });

  it("refuse une date de fin avant la date de début", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const result = await validerFinAnnee({ libelle: "2027-2028", dateDebut: "2027-10-01", dateFin: "2027-09-01" });
    expect(result.error).toBe("La date de fin doit être après la date de début");
  });
});
