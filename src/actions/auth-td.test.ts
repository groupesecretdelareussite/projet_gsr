import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/session-td", () => ({ getTdProfesseurSession: vi.fn() }));
vi.mock("@/lib/brute-force", () => ({
  tropDeTentatives: vi.fn().mockResolvedValue(false),
  enregistrerTentative: vi.fn().mockResolvedValue(undefined),
  extraireIpClient: vi.fn().mockResolvedValue("127.0.0.1"),
}));
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("mocked_new_hash"),
  },
}));

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";
import bcrypt from "bcryptjs";
import { changerMonMotDePasseProf, connexionProfesseurTD } from "./auth-td";

describe("changerMonMotDePasseProf — changement de mot de passe en libre-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["", "court", "1234567"])(
    "rejette un mot de passe trop court (%s)",
    async (nouveauMdp) => {
      const res = await changerMonMotDePasseProf("ancienSecret123", nouveauMdp);
      expect(res.error).toBe("Le mot de passe doit contenir au moins 8 caractères");
    }
  );

  it("rejette si le professeur n'est pas authentifié", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({} as never);
    const res = await changerMonMotDePasseProf("ancienSecret123", "nouveauSecret123");
    expect(res.error).toBe("Non authentifié");
  });

  it("rejette si le professeur est introuvable ou inactif", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({
      professeurId: 42,
    } as never);

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 42, actif: false, valide: true, mot_de_passe: "old_hash", email: "prof@gsr.bj" },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValueOnce({
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    const res = await changerMonMotDePasseProf("ancienSecret123", "nouveauSecret123");
    expect(res.error).toBe("Compte inactif ou non validé");
  });

  it("rejette si l'ancien mot de passe est incorrect", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({
      professeurId: 42,
    } as never);

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 42, actif: true, valide: true, mot_de_passe: "old_hash", email: "prof@gsr.bj" },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(createServiceRoleClient).mockReturnValueOnce({
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    const res = await changerMonMotDePasseProf("mauvaisAncienSecret", "nouveauSecret123");
    expect(res.error).toBe("Mot de passe actuel incorrect");
  });

  it("met à jour le mot de passe avec succès lorsque les données sont valides", async () => {
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({
      professeurId: 42,
    } as never);

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockSelectEq = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 42, actif: true, valide: true, mot_de_passe: "old_hash", email: "prof@gsr.bj" },
        error: null,
      }),
    });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    const mockFrom = vi.fn().mockImplementation(() => ({
      select: mockSelect,
      update: mockUpdate,
    }));

    vi.mocked(createServiceRoleClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValueOnce("new_hashed_pwd" as never);

    const res = await changerMonMotDePasseProf("ancienSecret123", "nouveauSecret123");

    expect(res.error).toBeUndefined();
    expect(bcrypt.compare).toHaveBeenCalledWith("ancienSecret123", "old_hash");
    expect(bcrypt.hash).toHaveBeenCalledWith("nouveauSecret123", 10);
    expect(mockUpdate).toHaveBeenCalledWith({ mot_de_passe: "new_hashed_pwd" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", 42);
  });
});

describe("connexionProfesseurTD — assainissement des identifiants (espaces & casse)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejette immédiatement si l'email ne contient que des espaces", async () => {
    const res = await connexionProfesseurTD("   ", "motdepasse123");
    expect(res.error).toBe("Identifiants invalides");
  });

  it("nettoie les espaces au début, à la fin et normalise en minuscules", async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getTdProfesseurSession).mockResolvedValueOnce({
      save: mockSave,
    } as never);

    const mockEq = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 10,
          nom: "Houegbe",
          prenom: "Axel",
          mot_de_passe: "hashed_pwd",
          actif: true,
          valide: true,
        },
        error: null,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      schema: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

    const res = await connexionProfesseurTD("   Prof.Axel@GSR.BJ   ", "motdepasse123");

    expect(res.error).toBeUndefined();
    // Vérifie que la requête SQL a bien reçu l'email nettoyé (sans espaces et en minuscules)
    expect(mockEq).toHaveBeenCalledWith("email", "prof.axel@gsr.bj");
    expect(mockSave).toHaveBeenCalled();
  });
});

