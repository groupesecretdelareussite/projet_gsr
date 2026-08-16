import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { enregistrerAppelDuJour, marquerRetardataire } from "./presences";

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

describe("Présences — secretaire aligné sur chef_site (§discussion 2026-08-15)", () => {
  it("n'exclut plus le rôle secretaire pour enregistrerAppelDuJour", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", siteId: 1, isGlobal: false }));

    // presences vide : retour anticipé avant tout appel Supabase — suffit à
    // prouver que la garde de rôle est passée.
    const result = await enregistrerAppelDuJour({
      datePresence: "2026-07-28",
      siteId: 1,
      classeId: 1,
      anneeScolaireId: 1,
      presences: [],
    });
    expect(result).toEqual({});
  });
});

describe("enregistrerAppelDuJour", () => {
  function mockPresencesTable(existant: { id: number }[], upsertMock = vi.fn().mockResolvedValue({ error: null })) {
    return {
      select: () => ({
        eq: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: existant, error: null }) }) }),
      }),
      upsert: upsertMock,
    };
  }

  it("envoie l'état mixte présent/absent en un seul upsert multi-lignes, si aucun appel n'existe déjà", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      from: () => mockPresencesTable([], upsertMock),
    } as never);

    const result = await enregistrerAppelDuJour({
      datePresence: "2026-08-16",
      siteId: 1,
      classeId: 2,
      anneeScolaireId: 3,
      presences: [
        { eleveId: 10, present: true },
        { eleveId: 11, present: false },
      ],
    });

    expect(result).toEqual({});
    expect(upsertMock).toHaveBeenCalledWith(
      [
        { eleve_id: 10, date_presence: "2026-08-16", site_id: 1, classe_id: 2, annee_scolaire_id: 3, present: true },
        { eleve_id: 11, date_presence: "2026-08-16", site_id: 1, classe_id: 2, annee_scolaire_id: 3, present: false },
      ],
      { onConflict: "eleve_id,date_presence" }
    );
  });

  it("refuse un second appel pour la même classe/date — seul Retardataires peut modifier ensuite", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      from: () => mockPresencesTable([{ id: 999 }], upsertMock),
    } as never);

    const result = await enregistrerAppelDuJour({
      datePresence: "2026-08-16",
      siteId: 1,
      classeId: 2,
      anneeScolaireId: 3,
      presences: [{ eleveId: 10, present: true }],
    });

    expect(result.error).toMatch(/déjà été enregistré/);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe("marquerRetardataire", () => {
  it("résout classe/site/année automatiquement et marque présent", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", siteId: 1, isGlobal: false }));

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      from: (table: string) => {
        if (table === "eleves") {
          return {
            select: () => ({
              eq: () => ({ single: () => Promise.resolve({ data: { classe_id: 5, classes: { site_id: 1 } }, error: null }) }),
            }),
          };
        }
        if (table === "annees_scolaires") {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 2 }, error: null }) }) }) };
        }
        if (table === "presences") {
          return { upsert: upsertMock };
        }
        throw new Error(`table inattendue : ${table}`);
      },
    } as never);

    const result = await marquerRetardataire({ eleveId: 42 });

    expect(result).toEqual({});
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ eleve_id: 42, classe_id: 5, site_id: 1, annee_scolaire_id: 2, present: true }),
      { onConflict: "eleve_id,date_presence" }
    );
  });

  it("renvoie une erreur si l'élève est introuvable (ex. hors périmètre RLS)", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    vi.mocked(createClient).mockResolvedValue({
      from: (table: string) => {
        if (table === "eleves") {
          return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: "introuvable" } }) }) }) };
        }
        if (table === "annees_scolaires") {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 2 }, error: null }) }) }) };
        }
        return {};
      },
    } as never);

    const result = await marquerRetardataire({ eleveId: 999 });
    expect(result.error).toBe("Élève introuvable");
  });
});
