import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session-td", () => ({ getTdProfesseurSession: vi.fn() }));

import { getTdProfesseurSession } from "@/lib/session-td";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { MAX_CANDIDATURES_PAR_CRENEAU } from "@/lib/constants";
import { soumettrePostulationTD, retirerPostulationTD } from "./td-postulations";

describe("Candidatures TD — session professeur requise (§10.7)", () => {
  it("rejette soumettrePostulationTD sans session professeur", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({ professeurId: undefined } as never);
    await expect(soumettrePostulationTD(1)).rejects.toThrow("Non authentifié");
  });

  it("rejette retirerPostulationTD sans session professeur", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({ professeurId: undefined } as never);
    await expect(retirerPostulationTD(1)).rejects.toThrow("Non authentifié");
  });
});

describe("Candidatures TD — Plafond de 3 candidatures par créneau", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTdProfesseurSession).mockResolvedValue({ professeurId: 10 } as never);
  });

  it("vérifie que la constante MAX_CANDIDATURES_PAR_CRENEAU est fixée à 3", () => {
    expect(MAX_CANDIDATURES_PAR_CRENEAU).toBe(3);
  });

  it("rejette la postulation si le créneau a déjà atteint 3 candidatures en attente", async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "creneaux") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { statut_creneau: "public" }, error: null }),
            }),
          }),
        };
      }
      if (table === "postulations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    const res = await soumettrePostulationTD(1);
    expect(res.error).toBe("Ce créneau a déjà atteint le nombre maximal de candidatures (3).");
  });

  it("accepte la postulation si le créneau a moins de 3 candidatures en attente", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "creneaux") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { statut_creneau: "public" }, error: null }),
            }),
          }),
        };
      }
      if (table === "postulations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
            }),
          }),
          insert: mockInsert,
        };
      }
      return {};
    });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    const res = await soumettrePostulationTD(1);
    expect(res.error).toBeUndefined();
    expect(mockInsert).toHaveBeenCalledWith({ creneau_id: 1, professeur_id: 10 });
  });
});

