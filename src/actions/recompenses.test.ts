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
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { payerRecompensesEleve, toutPayerRecompenses } from "./recompenses";

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

describe("Récompenses — Gardes de rôle", () => {
  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s pour payerRecompensesEleve", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(
      payerRecompensesEleve({
        eleveId: 1,
        mois: "Octobre",
        anneeScolaireId: 1,
        notes: [{ noteId: 10, typeGain: "interro", montant: 200 }],
      })
    ).rejects.toThrow("Non autorisé");
  });

  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s pour toutPayerRecompenses", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false }));

    await expect(
      toutPayerRecompenses({
        mois: "Octobre",
        anneeScolaireId: 1,
        eleves: [],
      })
    ).rejects.toThrow("Non autorisé");
  });
});

describe("Récompenses — Découplage de depenses_annexes", () => {
  it("payerRecompensesEleve insère dans public.recompenses avec depense_id null et ne touche jamais à depenses_annexes", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur", isGlobal: true }));

    const insertedRows: any[] = [];
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "eleves") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 1, nom: "KOFFI", prenoms: "Jean", classe_id: 10, classes: { nom_classe: "Terminale D", site_id: 2 } },
          }),
        };
      }
      if (table === "recompenses") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockImplementation((rows: any[]) => {
            insertedRows.push(...rows);
            return Promise.resolve({ error: null });
          }),
        };
      }
      if (table === "depenses_annexes") {
        throw new Error("depenses_annexes ne doit JAMAIS être appelée pour les récompenses scolaires !");
      }
      return {};
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: fromMock,
    } as any);

    const result = await payerRecompensesEleve({
      eleveId: 1,
      mois: "Octobre",
      anneeScolaireId: 1,
      notes: [{ noteId: 101, typeGain: "interro", montant: 200 }],
    });

    expect(result).toEqual({});
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      note_id: 101,
      eleve_id: 1,
      annee_scolaire_id: 1,
      mois: "Octobre",
      type_gain: "interro",
      montant: 200,
      depense_id: null,
      paye_par: "u1",
    });
  });

  it("toutPayerRecompenses insère dans public.recompenses avec depense_id null et ne touche pas à depenses_annexes", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur", isGlobal: true }));

    const insertedRows: any[] = [];
    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === "recompenses") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockImplementation((rows: any[]) => {
            insertedRows.push(...rows);
            return Promise.resolve({ error: null });
          }),
        };
      }
      if (table === "depenses_annexes") {
        throw new Error("depenses_annexes ne doit JAMAIS être appelée !");
      }
      return {};
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: fromMock,
    } as any);

    const result = await toutPayerRecompenses({
      mois: "Octobre",
      anneeScolaireId: 1,
      eleves: [
        {
          eleveId: 1,
          siteId: 2,
          nom: "KOFFI",
          prenoms: "Jean",
          nomClasse: "Terminale D",
          notes: [{ noteId: 101, typeGain: "interro", montant: 200 }],
        },
      ],
    });

    expect(result).toEqual({ nbPayes: 1 });
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].depense_id).toBeNull();
  });
});
