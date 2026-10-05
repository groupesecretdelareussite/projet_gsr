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
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { suspendreEleve, inscrireEleve, importerEleves, supprimerEleves } from "./eleves";

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

describe("suspendreEleve — garde de rôle (interdit #18)", () => {
  it("rejette le rôle chef_site — ne peut jamais suspendre un élève", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", isGlobal: false, siteId: 1 }));

    await expect(suspendreEleve(1, "maladie", "motif")).rejects.toThrow("Non autorisé");
  });

  it("rejette le rôle secretaire", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "secretaire", isGlobal: false }));

    await expect(suspendreEleve(1, "maladie", "motif")).rejects.toThrow("Non autorisé");
  });
});

describe("inscrireEleve — garde de rôle", () => {
  it("rejette le rôle chef_site — ne peut pas inscrire d'élève", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "chef_site", isGlobal: false, siteId: 1 }));

    await expect(
      inscrireEleve({
        nom: "TESTAUTO",
        prenoms: "Test",
        contactParent: "+2290100000000",
        contactParent2: "",
        classeId: 1,
        college: "COLLEGE TEST",
      })
    ).rejects.toThrow("Non autorisé");
  });
});

describe("importerEleves — garde de rôle", () => {
  it.each(["chef_site", "secretaire"] as const)("rejette le rôle %s", async (role) => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: false, siteId: 1 }));

    await expect(importerEleves(new FormData())).rejects.toThrow("Non autorisé");
  });
});

describe("importerEleves — validations avant lecture du fichier", () => {
  it("rejette l'absence de fichier", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));

    const result = await importerEleves(new FormData());
    expect(result.error).toBe("Fichier requis");
  });

  it("rejette un format qui n'est pas .xlsx", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));

    const formData = new FormData();
    formData.set("fichier", new File(["contenu"], "eleves.csv"));
    const result = await importerEleves(formData);
    expect(result.error).toBe("Format non supporté — utilisez le modèle .xlsx fourni");
  });
});

describe("inscrireEleve — au moins un contact requis (§discussion 2026-08-10)", () => {
  it("rejette si contactParent et contactParent2 sont tous les deux vides", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));

    const result = await inscrireEleve({
      nom: "TESTAUTO",
      prenoms: "Test",
      contactParent: "",
      contactParent2: "",
      classeId: 1,
      college: "COLLEGE TEST",
    });

    expect(result.error).toBe("Au moins un contact (WhatsApp ou téléphonique) doit être renseigné.");
  });
});

describe("inscrireEleve — format des numéros de téléphone", () => {
  it("rejette un numéro béninois qui ne commence pas par 01", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));

    const result = await inscrireEleve({
      nom: "TESTAUTO",
      prenoms: "Test",
      contactParent: "+22997921781",
      contactParent2: "",
      classeId: 1,
      college: "COLLEGE TEST",
    });

    expect(result.error).toBe("Numéro béninois invalide — format attendu : +229 01 XX XX XX XX");
  });

  it("rejette un numéro sans indicatif international", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({}));

    const result = await inscrireEleve({
      nom: "TESTAUTO",
      prenoms: "Test",
      contactParent: "0197921781",
      contactParent2: "",
      classeId: 1,
      college: "COLLEGE TEST",
    });

    expect(result.error).toBe("Numéro invalide — doit commencer par l'indicatif (+...) suivi des chiffres");
  });
});

describe("supprimerEleves — garde de rôle (réservé coordonnateur)", () => {
  it.each(["comptable", "superviseur", "chef_site", "secretaire"] as const)(
    "rejette le rôle %s",
    async (role) => {
      vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role, isGlobal: role === "comptable" }));

      await expect(supprimerEleves([1], "mon-mot-de-passe")).rejects.toThrow("Non autorisé");
    }
  );
});

describe("supprimerEleves — validation des paramètres & authentification", () => {
  it("rejette si aucun élève sélectionné", async () => {
    const result = await supprimerEleves([], "password");
    expect(result.error).toBe("Aucun élève sélectionné");
  });

  it("rejette si le mot de passe est vide", async () => {
    const result = await supprimerEleves([1], "");
    expect(result.error).toBe("Mot de passe requis");
  });

  it("rejette si le mot de passe est incorrect", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "coord@gsr.bj" } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: { message: "Invalid credentials" } }),
      },
    } as any);

    const result = await supprimerEleves([1], "mauvais-password");
    expect(result.error).toBe("Mot de passe incorrect");
  });
});

describe("supprimerEleves — blocage strict si paiements existants", () => {
  it("bloque la suppression si au moins un élève a déjà des paiements", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur" }));
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "coord@gsr.bj" } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 10,
                      matricule: "Y10240001",
                      nom: "KOFFI",
                      prenoms: "Jean",
                      classes: { site_id: 1 },
                    },
                  ],
                  error: null,
                })
              ),
            })),
          };
        }
        if (table === "paiements") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      eleve_id: 10,
                      montant_paye: 25000,
                      mois_souscription: "Octobre",
                    },
                  ],
                  error: null,
                })
              ),
            })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockAdmin as any);

    const result = await supprimerEleves([10], "bon-password");
    expect(result.error).toContain("Suppression bloquée");
    expect(result.error).toContain("KOFFI Jean");
  });
});

describe("supprimerEleves — succès et purge complète", () => {
  it("purge comptes_parents, log_whatsapp, paiements_supprimes et supprime l'élève si 0 paiement", async () => {
    vi.mocked(getUserScope).mockResolvedValueOnce(makeScope({ role: "coordonnateur", username: "coord" }));
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "coord@gsr.bj" } } }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    } as any);

    const deletedTables: string[] = [];

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === "eleves") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 10,
                      matricule: "Y10240001",
                      nom: "KOFFI",
                      prenoms: "Jean",
                      classes: { site_id: 1 },
                    },
                  ],
                  error: null,
                })
              ),
            })),
            delete: vi.fn(() => ({
              in: vi.fn(() => {
                deletedTables.push("eleves");
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        if (table === "paiements") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          };
        }
        if (["comptes_parents", "log_whatsapp", "paiements_supprimes"].includes(table)) {
          return {
            delete: vi.fn(() => ({
              in: vi.fn(() => {
                deletedTables.push(table);
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        if (table === "notifications") {
          return {
            insert: vi.fn(() => Promise.resolve({ error: null })),
          };
        }
        return {};
      }),
    };

    vi.mocked(createServiceRoleClient).mockReturnValueOnce(mockAdmin as any);

    const result = await supprimerEleves([10], "bon-password");
    expect(result.error).toBeUndefined();
    expect(result.count).toBe(1);
    expect(deletedTables).toContain("comptes_parents");
    expect(deletedTables).toContain("log_whatsapp");
    expect(deletedTables).toContain("paiements_supprimes");
    expect(deletedTables).toContain("eleves");
  });
});
