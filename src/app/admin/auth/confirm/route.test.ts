import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

describe("GET /admin/auth/confirm", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("ignore un en-tête x-forwarded-host malveillant et utilise NEXT_PUBLIC_APP_URL ou l'origin légitime", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://groupe-secretdelareussite.com";

    const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: vi.fn(),
      },
    } as never);

    const req = new NextRequest("https://groupe-secretdelareussite.com/admin/auth/confirm?code=valid-code", {
      headers: {
        "x-forwarded-host": "evil-phishing-site.com",
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("https://groupe-secretdelareussite.com/admin/reinitialiser-mot-de-passe");
    expect(location).not.toContain("evil-phishing-site.com");
  });

  it("échange le code et redirige vers /admin/reinitialiser-mot-de-passe", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;

    const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
        verifyOtp: vi.fn(),
      },
    } as never);

    const req = new NextRequest("http://localhost:3000/admin/auth/confirm?code=test-code");
    const response = await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin/reinitialiser-mot-de-passe");
  });

  it("vérifie token_hash et type puis redirige vers /admin/reinitialiser-mot-de-passe", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const mockVerifyOtp = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn(),
        verifyOtp: mockVerifyOtp,
      },
    } as never);

    const req = new NextRequest("http://localhost:3000/admin/auth/confirm?token_hash=thash&type=recovery");
    const response = await GET(req);

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: "thash", type: "recovery" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin/reinitialiser-mot-de-passe");
  });

  it("redirige vers /admin/login?erreur=lien_invalide en cas d'erreur ou d'absence de paramètres", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("invalid code") }),
        verifyOtp: vi.fn(),
      },
    } as never);

    const req = new NextRequest("http://localhost:3000/admin/auth/confirm?code=bad-code");
    const response = await GET(req);

    expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login?erreur=lien_invalide");
  });
});
