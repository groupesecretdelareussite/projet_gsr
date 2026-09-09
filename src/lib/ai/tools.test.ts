import { describe, it, expect, vi } from "vitest";
import { GEMINI_TOOL_DECLARATIONS, executeToolCall } from "./tools";
import type { UserScope } from "@/lib/auth-scope";

describe("Agent IA — Outils de Lecture Seule", () => {
  it("déclare bien les 8 outils de consultation autorisés", () => {
    const names = GEMINI_TOOL_DECLARATIONS.map((t) => t.name);
    expect(names).toContain("rechercher_eleves");
    expect(names).toContain("get_fiche_eleve");
    expect(names).toContain("get_etat_paiements_et_recouvrement");
    expect(names).toContain("get_bilan_comptable");
    expect(names).toContain("get_synthese_presences");
    expect(names).toContain("get_performances_pedagogiques");
    expect(names).toContain("get_planning_td");
    expect(names).toContain("get_regles_metier_gsr");
    expect(names.length).toBe(8);
  });

  describe("get_regles_metier_gsr", () => {
    const fakeScope: UserScope = {
      userId: "11111111-1111-1111-1111-111111111111",
      username: "coord",
      role: "coordonnateur",
      siteId: null,
      siteIds: [],
      isGlobal: true,
    };
    const fakeSupabase = {} as any;

    it("retourne l'explication sur les suspensions", async () => {
      const res = await executeToolCall("get_regles_metier_gsr", { sujet: "suspension" }, {
        supabase: fakeSupabase,
        scope: fakeScope,
      });
      expect(res.sujet).toBe("suspension");
      expect(res.explication.toLowerCase()).toContain("suspension automatique");
    });

    it("retourne l'explication sur les paiements et les 8 mois", async () => {
      const res = await executeToolCall("get_regles_metier_gsr", { sujet: "paiements" }, {
        supabase: fakeSupabase,
        scope: fakeScope,
      });
      expect(res.explication).toContain("Octobre à Mai");
    });

    it("retourne l'explication sur la règle A du TD", async () => {
      const res = await executeToolCall("get_regles_metier_gsr", { sujet: "td" }, {
        supabase: fakeSupabase,
        scope: fakeScope,
      });
      expect(res.explication).toContain("Règle A");
    });
  });

  describe("Contrôle d'accès et sécurité des scopes", () => {
    it("refuse get_bilan_comptable pour un superviseur", async () => {
      const supScope: UserScope = {
        userId: "22222222-2222-2222-2222-222222222222",
        username: "superviseur1",
        role: "superviseur",
        siteId: null,
        siteIds: [1],
        isGlobal: false,
      };

      const res = await executeToolCall("get_bilan_comptable", {}, {
        supabase: {} as any,
        scope: supScope,
      });

      expect(res.error).toContain("Accès refusé");
      expect(res.error).toContain("réservée au Coordonnateur et au Comptable");
    });

    it("rejette une recherche d'élèves vide ou de moins de 2 caractères", async () => {
      const res = await executeToolCall("rechercher_eleves", { query: "a" }, {
        supabase: {} as any,
        scope: {
          userId: "11111111-1111-1111-1111-111111111111",
          username: "coord",
          role: "coordonnateur",
          siteId: null,
          siteIds: [],
          isGlobal: true,
        },
      });

      expect(res.error).toContain("au moins 2 caractères");
    });

    it("refuse get_fiche_eleve si l'élève est sur un site hors du scope du superviseur", async () => {
      const supScope: UserScope = {
        userId: "22222222-2222-2222-2222-222222222222",
        username: "superviseur1",
        role: "superviseur",
        siteId: null,
        siteIds: [1], // assigné au site 1 uniquement
        isGlobal: false,
      };

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 99,
                  matricule: "A10260099",
                  nom: "TEST",
                  prenoms: "Jean",
                  classes: {
                    site_id: 2, // site 2 != site 1
                    nom_classe: "3ème",
                    sites: { nom_site: "Akpakpa" },
                  },
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      const res = await executeToolCall("get_fiche_eleve", { eleve_id: 99 }, {
        supabase: mockSupabase,
        scope: supScope,
      });

      expect(res.error).toContain("Accès refusé");
      expect(res.error).toContain("périmètre assigné");
    });

    it("retourne une erreur pour un outil inconnu", async () => {
      const res = await executeToolCall("supprimer_base_de_donnees", {}, {
        supabase: {} as any,
        scope: {
          userId: "11111111-1111-1111-1111-111111111111",
          username: "coord",
          role: "coordonnateur",
          siteId: null,
          siteIds: [],
          isGlobal: true,
        },
      });

      expect(res.error).toContain("Outil inconnu");
    });
  });
});
