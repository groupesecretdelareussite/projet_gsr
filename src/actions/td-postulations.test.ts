import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session-td", () => ({ getTdProfesseurSession: vi.fn() }));

import { getTdProfesseurSession } from "@/lib/session-td";
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
