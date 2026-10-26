import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/brute-force", () => ({
  tropDeTentatives: vi.fn().mockResolvedValue(false),
  enregistrerTentative: vi.fn().mockResolvedValue(undefined),
  extraireIpClient: vi.fn().mockResolvedValue("127.0.0.1"),
}));

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { login, demanderReinitialisationMotDePasse } from "./auth";

describe("login — assainissement des identifiants (espaces & casse)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejette immédiatement si le nom d'utilisateur est vide ou ne contient que des espaces", async () => {
    const res = await login("    ", "motdepasse123");
    expect(res.error).toBe("Identifiants invalides");
  });

  it("retire les espaces superflus et normalise le nom d'utilisateur en minuscules", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { email: "m.traore@gsr.bj", actif: true },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: mockFrom,
    } as never);

    const mockSignInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const mockGetAal = vi.fn().mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal1" },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        mfa: { getAuthenticatorAssuranceLevel: mockGetAal },
      },
    } as never);

    const res = await login("   M.Traore   ", "motdepasse123");

    expect(res.error).toBeUndefined();
    expect(res.requireMfa).toBeUndefined();
    // Le username envoyé à PostgreSQL doit être nettoyé
    expect(mockEq).toHaveBeenCalledWith("username", "m.traore");
    // L'authentification Supabase Auth doit être appelée avec l'email résolu
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "m.traore@gsr.bj",
      password: "motdepasse123",
    });
  });

  it("renvoie requireMfa: true si le compte possède un facteur TOTP actif (aal2 requis)", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { email: "coordonnateur@gsr.bj", actif: true },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: mockFrom,
    } as never);

    const mockSignInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: "coord-123" } },
      error: null,
    });

    const mockGetAal = vi.fn().mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        mfa: { getAuthenticatorAssuranceLevel: mockGetAal },
      },
    } as never);

    const res = await login("coordonnateur", "motdepasse123");

    expect(res.error).toBeUndefined();
    expect(res.requireMfa).toBe(true);
  });
});

describe("demanderReinitialisationMotDePasse — assainissement de l'email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retire les espaces superflus de l'email avant l'appel Supabase Auth", async () => {
    const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockResolvedValue({
      auth: { resetPasswordForEmail: mockResetPasswordForEmail },
    } as never);

    await demanderReinitialisationMotDePasse("   Admin@GSR.BJ   ");

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "admin@gsr.bj",
      expect.objectContaining({
        redirectTo: expect.stringContaining("/admin/auth/confirm"),
      })
    );
  });
});
