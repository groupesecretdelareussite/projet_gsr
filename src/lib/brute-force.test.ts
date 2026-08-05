import { describe, it, expect, vi } from "vitest";
import type { createServiceRoleClient } from "@/lib/supabase/admin";
import { tropDeTentatives, enregistrerTentative } from "./brute-force";

type AdminClient = ReturnType<typeof createServiceRoleClient>;

function makeCountClient(count: number) {
  const eqCalls: [string, unknown][] = [];
  const chain = Promise.resolve({ count }) as unknown as {
    select: (...args: unknown[]) => typeof chain;
    eq: (col: string, val: unknown) => typeof chain;
    gte: (...args: unknown[]) => typeof chain;
  };
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return chain;
  });
  chain.gte = vi.fn(() => chain);
  const from = vi.fn(() => chain);
  return { client: { from } as unknown as AdminClient, eqCalls };
}

describe("tropDeTentatives — seuil de verrouillage partagé par les 3 portails (§5.6)", () => {
  it("retourne true quand le nombre d'échecs atteint le seuil (5)", async () => {
    const { client } = makeCountClient(5);
    await expect(tropDeTentatives(client, "test@example.com", "admin")).resolves.toBe(true);
  });

  it("retourne false sous le seuil", async () => {
    const { client } = makeCountClient(4);
    await expect(tropDeTentatives(client, "test@example.com", "admin")).resolves.toBe(false);
  });

  it.each(["admin", "parent", "td"] as const)("filtre bien par le portail %s", async (portail) => {
    const { client, eqCalls } = makeCountClient(0);
    await tropDeTentatives(client, "identifiant-test", portail);
    expect(eqCalls).toContainEqual(["portail", portail]);
  });
});

describe("enregistrerTentative", () => {
  it("insère une ligne avec l'identifiant, le portail et le statut fournis", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ insert })) } as unknown as AdminClient;

    await enregistrerTentative(client, "test@example.com", "parent", false);

    expect(insert).toHaveBeenCalledWith({ identifiant: "test@example.com", portail: "parent", reussi: false });
  });
});
