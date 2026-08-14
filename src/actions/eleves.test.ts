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
import { suspendreEleve, inscrireEleve, importerEleves } from "./eleves";

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
