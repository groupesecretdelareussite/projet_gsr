import { describe, it, expect, vi } from "vitest";
import type { UserScope } from "@/lib/auth-scope";
import type { createServiceRoleClient as CreateServiceRoleClient } from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/auth-scope", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-scope")>("@/lib/auth-scope");
  return { ...actual, getUserScope: vi.fn() };
});

import { getUserScope } from "@/lib/auth-scope";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { marquerNotificationLue, marquerToutesNotificationsLues } from "./notifications";

type AdminClient = ReturnType<typeof CreateServiceRoleClient>;

function makeScope(overrides: Partial<UserScope>): UserScope {
  return {
    userId: "u1",
    username: "test",
    role: "chef_site",
    siteId: 1,
    siteIds: [],
    isGlobal: false,
    ...overrides,
  };
}

function makeToutesClient(rows: { id: number; site_id: number }[]) {
  const idsMisAJour: number[] = [];
  const selectBuilder = { in: vi.fn(() => Promise.resolve({ data: rows })) };
  const updateBuilder = {
    in: vi.fn((_col: string, ids: number[]) => {
      idsMisAJour.push(...ids);
      return Promise.resolve({ error: null });
    }),
  };
  const from = vi.fn(() => ({
    select: vi.fn(() => selectBuilder),
    update: vi.fn(() => updateBuilder),
  }));
  return { client: { from } as unknown as AdminClient, idsMisAJour };
}

describe("marquerToutesNotificationsLues — filtre par périmètre (régression du point 1 de l'audit)", () => {
  it("ne met à jour que les notifications dont le site est dans le périmètre de l'appelant", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", siteId: 1, isGlobal: false }));
    const { client, idsMisAJour } = makeToutesClient([
      { id: 10, site_id: 1 }, // dans le périmètre du chef_site (site 1)
      { id: 20, site_id: 2 }, // hors périmètre — ne doit jamais être marqué lu
    ]);
    vi.mocked(createServiceRoleClient).mockReturnValue(client);

    await marquerToutesNotificationsLues([10, 20]);

    expect(idsMisAJour).toEqual([10]);
  });

  it("ne fait aucune mise à jour si aucun id fourni n'est dans le périmètre", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", siteId: 1, isGlobal: false }));
    const { client, idsMisAJour } = makeToutesClient([{ id: 20, site_id: 2 }]);
    vi.mocked(createServiceRoleClient).mockReturnValue(client);

    await marquerToutesNotificationsLues([20]);

    expect(idsMisAJour).toEqual([]);
  });

  it("laisse passer tous les ids pour un rôle global (coordonnateur)", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur", isGlobal: true, siteId: null }));
    const { client, idsMisAJour } = makeToutesClient([
      { id: 10, site_id: 1 },
      { id: 20, site_id: 2 },
    ]);
    vi.mocked(createServiceRoleClient).mockReturnValue(client);

    await marquerToutesNotificationsLues([10, 20]);

    expect(idsMisAJour).toEqual([10, 20]);
  });

  it("exclut les notifications dont les roles_cibles ne contiennent pas le rôle de l'utilisateur", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", siteId: 1, isGlobal: false }));
    const { client, idsMisAJour } = makeToutesClient([
      { id: 10, site_id: 1, roles_cibles: ["coordonnateur", "comptable", "superviseur", "chef_site"] } as any, // secrétaire non ciblé
      { id: 11, site_id: 1, roles_cibles: null } as any, // notification générale
    ]);
    vi.mocked(createServiceRoleClient).mockReturnValue(client);

    await marquerToutesNotificationsLues([10, 11]);

    expect(idsMisAJour).toEqual([11]);
  });
});

describe("marquerNotificationLue — respect de roles_cibles", () => {
  it("autorise le marquage si le rôle fait partie des roles_cibles", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", siteId: 1, isGlobal: false }));
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: { site_id: 1, roles_cibles: ["coordonnateur", "superviseur", "chef_site"] },
              })
            ),
          })),
        })),
        update: updateSpy,
      })),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as any);

    const result = await marquerNotificationLue(42);

    expect(result.error).toBeUndefined();
    expect(updateSpy).toHaveBeenCalledWith({ lu: true });
  });

  it("interdit le marquage si le rôle ne fait pas partie des roles_cibles", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", siteId: 1, isGlobal: false }));
    const updateSpy = vi.fn();
    const mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: { site_id: 1, roles_cibles: ["coordonnateur", "comptable", "superviseur", "chef_site"] },
              })
            ),
          })),
        })),
        update: updateSpy,
      })),
    };
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as any);

    const result = await marquerNotificationLue(42);

    expect(result.error).toBe("Non autorisé");
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

