import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// §Niveau 3 — mock du seul point d'accès aux cookies Next.js (indisponible
// hors requête réelle) pour lui substituer un client réel, déjà authentifié
// comme le compte de test coordonnateur. createServiceRoleClient n'est PAS
// mocké : inscrireEleve() doit vraiment écrire dans le projet Supabase.
let authedClient: SupabaseClient;
vi.mock("@/lib/supabase/server", () => ({ createClient: () => authedClient }));
// revalidatePath exige un store de requête Next.js réel, absent ici (Vitest
// pur) — mocké comme en Niveau 2, ça n'a aucun rapport avec ce que ce test
// vérifie (l'écriture réseau réelle).
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { inscrireEleve } from "./eleves";

describe("inscrireEleve — intégration Niveau 3 (réseau réel)", () => {
  let jonquetClasseId: number;
  let createdEleveId: number | null = null;

  beforeAll(async () => {
    authedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: authError } = await authedClient.auth.signInWithPassword({
      email: process.env.TEST_COORDONNATEUR_EMAIL!,
      password: process.env.TEST_COORDONNATEUR_PASSWORD!,
    });
    if (authError) {
      throw new Error(
        `Échec connexion compte test coordonnateur (voir .env.test.local) : ${authError.message}`
      );
    }

    const { data: classe, error: classeError } = await authedClient
      .from("classes")
      .select("id, sites!inner(initiale)")
      .eq("nom_classe", "6ème")
      .eq("sites.initiale", "J")
      .single();
    if (classeError || !classe) {
      throw new Error("Classe 6ème/Jonquet introuvable — sql/005_seed.sql a-t-il été appliqué ?");
    }
    jonquetClasseId = classe.id;
  });

  afterAll(async () => {
    // §Hygiène des données — nettoyage explicite par id, jamais de suppression en masse.
    if (createdEleveId) {
      await authedClient.from("eleves").delete().eq("id", createdEleveId);
    }
  });

  it("crée réellement un élève avec un matricule unique au format [J][MM][AA][XXXX]", async () => {
    const result = await inscrireEleve({
      nom: "TESTAUTO",
      prenoms: "Intégration Vitest",
      contactParent: "+22900000001",
      classeId: jonquetClasseId,
      college: "COLLEGE TESTAUTO",
    });

    expect(result.error).toBeUndefined();
    expect(result.matricule).toMatch(/^J\d{8}$/);

    const { data: eleve } = await authedClient
      .from("eleves")
      .select("id, matricule, statut")
      .eq("matricule", result.matricule!)
      .single();

    expect(eleve).not.toBeNull();
    expect(eleve!.statut).toBe("actif");
    createdEleveId = eleve!.id;
  });
});
