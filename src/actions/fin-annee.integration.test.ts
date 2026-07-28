import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// §Niveau 3 — même pattern que eleves.integration.test.ts : substitue un
// client réel authentifié comme le compte de test coordonnateur (nécessaire
// à getUserScope() ET à auth.uid() côté fonction SQL valider_fin_annee()).
let authedClient: SupabaseClient;
vi.mock("@/lib/supabase/server", () => ({ createClient: () => authedClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { demarrerRevueFinAnnee, annulerRevueFinAnnee, enregistrerDecisionPassage, validerFinAnnee } from "./fin-annee";

/**
 * Ce test ne valide JAMAIS réellement la fin d'année (validerFinAnnee avec
 * une revue complète) — ça terminerait l'année scolaire "2026-2027" en cours
 * et supprimerait tous les élèves démo encore suspendus, ce qui casserait le
 * jeu de données que l'utilisateur utilise pour tester le reste de
 * l'application. Il vérifie démarrer/décider/bloquer-si-incomplet/annuler,
 * qui sont tous réversibles, puis restaure explicitement l'état d'origine.
 */
describe("Fin d'année — intégration Niveau 3 (réseau réel, non destructif)", () => {
  let admin: SupabaseClient;
  let anneeId: number;
  let classeChaineId: number; // classe avec classe_suivante_id défini (ex. 6ème)
  let classePointDecisionId: number; // classe avec classe_suivante_id = NULL (ex. 3ème Jéricho)
  let eleveChaineId: number;
  let elevePointDecisionId: number;

  beforeAll(async () => {
    authedClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: authError } = await authedClient.auth.signInWithPassword({
      email: process.env.TEST_COORDONNATEUR_EMAIL!,
      password: process.env.TEST_COORDONNATEUR_PASSWORD!,
    });
    if (authError) throw new Error(`Échec connexion compte test coordonnateur : ${authError.message}`);

    admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: anneeEnCours, error: anneeError } = await admin
      .from("annees_scolaires")
      .select("id")
      .eq("statut", "en_cours")
      .single();
    if (anneeError || !anneeEnCours) throw new Error("Aucune année en_cours — précondition du test non remplie");
    anneeId = anneeEnCours.id;

    const { data: classeChaine } = await admin
      .from("classes")
      .select("id, sites!inner(initiale)")
      .eq("nom_classe", "6ème")
      .eq("sites.initiale", "J")
      .not("classe_suivante_id", "is", null)
      .single();
    if (!classeChaine) throw new Error("Classe 6ème/Jéricho introuvable ou sans classe_suivante_id");
    classeChaineId = classeChaine.id;

    const { data: classePointDecision } = await admin
      .from("classes")
      .select("id, sites!inner(initiale)")
      .eq("nom_classe", "3ème")
      .eq("sites.initiale", "J")
      .is("classe_suivante_id", null)
      .single();
    if (!classePointDecision) throw new Error("Classe 3ème/Jéricho introuvable ou avec classe_suivante_id défini");
    classePointDecisionId = classePointDecision.id;

    const { data: eleveChaine } = await admin
      .from("eleves")
      .select("id")
      .eq("classe_id", classeChaineId)
      .eq("statut", "actif")
      .limit(1)
      .single();
    if (!eleveChaine) throw new Error("Aucun élève actif en 6ème/Jéricho — le jeu de données démo a-t-il été seedé ?");
    eleveChaineId = eleveChaine.id;

    const { data: elevePointDecision } = await admin
      .from("eleves")
      .select("id")
      .eq("classe_id", classePointDecisionId)
      .eq("statut", "actif")
      .limit(1)
      .single();
    if (!elevePointDecision) throw new Error("Aucun élève actif en 3ème/Jéricho — le jeu de données démo a-t-il été seedé ?");
    elevePointDecisionId = elevePointDecision.id;
  });

  afterAll(async () => {
    // Filet de sécurité : si une assertion échoue en cours de route, on
    // remet quand même l'année en en_cours et on vide decisions_passage,
    // pour ne jamais laisser le jeu de données démo bloqué en revue.
    await admin.from("decisions_passage").delete().gt("id", 0);
    await admin.from("annees_scolaires").update({ statut: "en_cours" }).eq("id", anneeId);
  });

  it("démarre la revue, pré-remplit les décisions en chaîne, laisse les points de décision vides, bloque la validation si incomplète, puis annule proprement", async () => {
    const demarrer = await demarrerRevueFinAnnee();
    expect(demarrer.error).toBeUndefined();

    const { data: anneeApresDemarrage } = await admin.from("annees_scolaires").select("statut").eq("id", anneeId).single();
    expect(anneeApresDemarrage!.statut).toBe("en_pause");

    const { data: decisionChaine } = await admin
      .from("decisions_passage")
      .select("decision, nouvelle_classe_id")
      .eq("eleve_id", eleveChaineId)
      .maybeSingle();
    expect(decisionChaine?.decision).toBe("passe");
    expect(decisionChaine?.nouvelle_classe_id).not.toBeNull();

    const { data: decisionPointDecision } = await admin
      .from("decisions_passage")
      .select("id")
      .eq("eleve_id", elevePointDecisionId)
      .maybeSingle();
    expect(decisionPointDecision).toBeNull();

    const validationIncomplete = await validerFinAnnee({
      libelle: "TESTAUTO-2099-2100",
      dateDebut: "2099-10-01",
      dateFin: "2100-05-31",
    });
    expect(validationIncomplete.error).toMatch(/sans décision de passage/);

    const decision = await enregistrerDecisionPassage({ eleveId: elevePointDecisionId, decision: "redouble" });
    expect(decision.error).toBeUndefined();

    const { data: decisionEnregistree } = await admin
      .from("decisions_passage")
      .select("decision")
      .eq("eleve_id", elevePointDecisionId)
      .single();
    expect(decisionEnregistree!.decision).toBe("redouble");

    const annuler = await annulerRevueFinAnnee();
    expect(annuler.error).toBeUndefined();

    const { data: anneeApresAnnulation } = await admin.from("annees_scolaires").select("statut").eq("id", anneeId).single();
    expect(anneeApresAnnulation!.statut).toBe("en_cours");

    const { count: decisionsRestantes } = await admin
      .from("decisions_passage")
      .select("*", { count: "exact", head: true });
    expect(decisionsRestantes).toBe(0);
  });
});
