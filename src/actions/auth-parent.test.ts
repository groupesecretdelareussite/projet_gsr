import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/session-parent", () => ({ getParentSession: vi.fn() }));

import { creerCompteParent } from "./auth-parent";

describe("creerCompteParent — validation du mot de passe (§9)", () => {
  it.each(["", "a", "1234567"])(
    "rejette un mot de passe trop court (%s) sans appeler Supabase",
    async (motDePasse) => {
      const result = await creerCompteParent({ matricule: "J07262625", motDePasse });
      expect(result.error).toBe("Le mot de passe doit contenir au moins 8 caractères");
    }
  );
});
