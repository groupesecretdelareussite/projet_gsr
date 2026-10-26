import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session-td", () => ({ getTdProfesseurSession: vi.fn() }));
vi.mock("@/lib/brute-force", () => ({ extraireIpClient: vi.fn().mockResolvedValue("127.0.0.1") }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});
vi.mock("@/lib/td-finances", async () => {
  const actual = await vi.importActual<typeof import("@/lib/td-finances")>("@/lib/td-finances");
  return {
    ...actual,
    getStatutFenetreRetrait: vi.fn().mockReturnValue({
      estOuverte: true,
      jour: 28,
      dernierJour: 31,
      moisFormat: "2026-10",
      moisLibelle: "octobre 2026",
      prochaineOuvertureLibelle: "28 novembre 2026",
    }),
  };
});

import { getTdProfesseurSession } from "@/lib/session-td";
import { getUserScope } from "@/lib/auth-scope";
import { createClient } from "@/lib/supabase/server";
import { getStatutFenetreRetrait } from "@/lib/td-finances";
import {
  demanderRetraitProfTD,
  validerPaiementProfTD,
  rejeterDemandeRetraitProfTD,
} from "./td-paiements";

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

describe("Paiements & Retraits TD — Demande par le professeur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStatutFenetreRetrait).mockReturnValue({
      estOuverte: true,
      jour: 28,
      dernierJour: 31,
      moisFormat: "2026-10",
      moisLibelle: "octobre 2026",
      prochaineOuvertureLibelle: "28 novembre 2026",
    });
  });

  it("rejette demanderRetraitProfTD sans session professeur", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({ professeurId: undefined } as never);
    const res = await demanderRetraitProfTD({
      montant: 10000,
      reseau: "celtis",
      numeroMomo: "40123456",
    });
    expect(res.error).toBe("Non authentifié");
  });

  it("rejette la demande si la fenêtre de retrait est fermée", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({ professeurId: 10 } as never);
    vi.mocked(getStatutFenetreRetrait).mockReturnValueOnce({
      estOuverte: false,
      jour: 15,
      dernierJour: 31,
      moisFormat: "2026-10",
      moisLibelle: "octobre 2026",
      prochaineOuvertureLibelle: "28 octobre 2026",
    });

    const res = await demanderRetraitProfTD({
      montant: 10000,
      reseau: "celtis",
      numeroMomo: "40123456",
    });
    expect(res.error).toContain("La période de retrait est fermée");
  });

  it("rejette un montant inférieur à 5 000 F CFA", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({ professeurId: 10 } as never);
    const res = await demanderRetraitProfTD({
      montant: 2000,
      reseau: "celtis",
      numeroMomo: "40123456",
    });
    expect(res.error).toContain("5\u202f000 F CFA");
  });

  it("rejette un opérateur invalide", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({ professeurId: 10 } as never);
    const res = await demanderRetraitProfTD({
      montant: 10000,
      reseau: "orange" as never,
      numeroMomo: "40123456",
    });
    expect(res.error).toContain("opérateur Mobile Money valide");
  });
});

describe("Paiements & Retraits TD — Contrôle Coordonnateur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue({} as never);
  });

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour validerPaiementProfTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      const res = await validerPaiementProfTD(1, "CEL-12345");
      expect(res.error).toBe("Non autorisé : réservé au coordonnateur");
    }
  );

  it("rejette validerPaiementProfTD sans référence de transaction", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const res = await validerPaiementProfTD(1, "   ");
    expect(res.error).toContain("référence de transaction Mobile Money est obligatoire");
  });

  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s pour rejeterDemandeRetraitProfTD",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));
      const res = await rejeterDemandeRetraitProfTD(1, "Numéro erroné");
      expect(res.error).toBe("Non autorisé : réservé au coordonnateur");
    }
  );

  it("rejette rejeterDemandeRetraitProfTD sans motif de rejet", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const res = await rejeterDemandeRetraitProfTD(1, "");
    expect(res.error).toContain("motif de rejet clair");
  });
});
