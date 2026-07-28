import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { genererMatricule } from "./matricule";

/** §12.1 GSR_ARCHITECTURE.md — mock minimal de la chaîne .from().select().eq() utilisée par genererMatricule(). */
function makeSupabaseMock(counts: number[]) {
  let call = 0;
  const eq = vi.fn(() => Promise.resolve({ count: counts[Math.min(call++, counts.length - 1)] }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, eq };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("genererMatricule (§8.3/§12.1)", () => {
  it("génère un matricule au format [INITIALE][MM][AA][XXXX] — 9 caractères", async () => {
    const { client } = makeSupabaseMock([0]);
    const matricule = await genererMatricule(client, "j");

    expect(matricule).toHaveLength(9);
    expect(matricule).toMatch(/^[A-Z]\d{2}\d{2}\d{4}$/);
    expect(matricule.startsWith("J")).toBe(true); // initiale toujours en majuscule
  });

  it("XXXX reste dans l'intervalle [1234, 9876]", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // borne basse
    const { client: clientMin } = makeSupabaseMock([0]);
    const matriculeMin = await genererMatricule(clientMin, "J");
    expect(Number(matriculeMin.slice(-4))).toBe(1234);

    vi.spyOn(Math, "random").mockReturnValue(0.999999999);
    const { client: clientMax } = makeSupabaseMock([0]);
    const matriculeMax = await genererMatricule(clientMax, "J");
    expect(Number(matriculeMax.slice(-4))).toBe(9876);
  });

  it("relance la génération en cas de collision détectée (count > 0)", async () => {
    const { client, eq } = makeSupabaseMock([1, 0]); // 1ère tentative en collision, 2e libre
    await genererMatricule(client, "A");

    expect(eq).toHaveBeenCalledTimes(2);
  });
});
