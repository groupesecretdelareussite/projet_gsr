import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// §Niveau 3 — même pattern que fin-annee.integration.test.ts : substitue un
// client réel authentifié comme le compte de test coordonnateur (nécessaire
// à getUserScope() ET à auth.uid() côté fonction SQL td.arbitrer_creneau(),
// SECURITY DEFINER — §10.4/§12.6). La session professeur (iron-session,
// cookies() indisponible hors requête Next.js) est simulée de la même façon,
// via un id mutable relu à chaque appel.
let authedClient: SupabaseClient;
let currentProfesseurId: number | null = null;
vi.mock("@/lib/supabase/server", () => ({ createClient: () => authedClient }));
vi.mock("@/lib/session-td", () => ({
  getTdProfesseurSession: async () => ({ professeurId: currentProfesseurId }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { creerSemaineTD, publierSemaineTD, cloturerSemaineTD } from "./td-semaines";
import { creerCreneauTD } from "./td-creneaux";
import { traiterArbitrageTD } from "./td-arbitrage";
import { soumettrePostulationTD } from "./td-postulations";

const PREFIXE = "TESTAUTO";

/** Toujours un lundi futur, jamais aujourd'hui — évite tout conflit avec un run précédent le même jour. */
function prochainLundi(): string {
  const d = new Date();
  const decalage = ((1 - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
}

async function creerOuRecupererProfesseurTest(
  admin: SupabaseClient,
  email: string,
  telephone: string,
  zoneId: number,
  matiereId: number
): Promise<number> {
  const { data: existant } = await admin.schema("td").from("professeurs").select("id").eq("email", email).maybeSingle();
  if (existant) return existant.id;

  const hash = await bcrypt.hash("MotDePasseTest123", 10);
  const { data: cree, error } = await admin
    .schema("td")
    .from("professeurs")
    .insert({
      nom: "TESTAUTO",
      prenom: email.split("@")[0],
      telephone,
      email,
      mot_de_passe: hash,
      zone_id: zoneId,
      matiere_principale_id: matiereId,
    })
    .select("id")
    .single();
  if (error || !cree) throw new Error(`Échec création professeur de test (${email}) : ${error?.message}`);
  return cree.id;
}

/**
 * Ce test exerce le cycle complet créneau (§12.7/§12.8) contre le vrai réseau
 * Supabase : création, publication, postulations concurrentes, puis
 * l'arbitrage atomique (Règle A) et la clôture de semaine — deux comportements
 * SQL non couverts par les tests Niveau 2 (garde-fous de rôle, mockés, sans
 * réseau). Les comptes professeurs de test sont créés une seule fois et
 * réutilisés d'un run à l'autre (jamais supprimés) ; chaque semaine créée est
 * préfixée TESTAUTO et supprimée après son test (cascade -> créneaux ->
 * postulations), avec un nettoyage préventif en amont au cas où un run
 * précédent aurait été interrompu.
 */
describe("Portail TD — intégration Niveau 3 (réseau réel)", () => {
  let admin: SupabaseClient;
  let zoneId: number;
  let matiereId: number;
  let classeAId: number;
  let classeBId: number;
  let prof1Id: number;
  let prof2Id: number;
  const dateTd = prochainLundi();

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

    await admin.schema("td").from("semaines").delete().ilike("libelle", `${PREFIXE}%`);

    const { data: zone } = await admin.schema("td").from("zones").select("id").eq("nom_zone", "Jéricho").maybeSingle();
    if (!zone) throw new Error("Zone TD 'Jéricho' introuvable — sql/009_td_module.sql a-t-il été appliqué ?");
    zoneId = zone.id;

    const { data: matiere } = await admin.schema("td").from("matieres_td").select("id").limit(1).maybeSingle();
    if (!matiere) throw new Error("Aucune matière TD trouvée — sql/005_seed.sql a-t-il été appliqué ?");
    matiereId = matiere.id;

    const { data: siteJericho } = await admin.from("sites").select("id").eq("initiale", "J").maybeSingle();
    if (!siteJericho) throw new Error("Site 'Jéricho' introuvable — sql/005_seed.sql a-t-il été appliqué ?");
    const { data: classeA } = await admin.from("classes").select("id").eq("nom_classe", "6ème").eq("site_id", siteJericho.id).maybeSingle();
    const { data: classeB } = await admin.from("classes").select("id").eq("nom_classe", "5ème").eq("site_id", siteJericho.id).maybeSingle();
    if (!classeA || !classeB) throw new Error("Classes '6ème'/'5ème' à Jéricho introuvables — sql/005_seed.sql a-t-il été appliqué ?");
    classeAId = classeA.id;
    classeBId = classeB.id;

    prof1Id = await creerOuRecupererProfesseurTest(admin, "testauto-prof1@gsr-tests.local", "+22900000091", zoneId, matiereId);
    prof2Id = await creerOuRecupererProfesseurTest(admin, "testauto-prof2@gsr-tests.local", "+22900000092", zoneId, matiereId);
  });

  afterEach(async () => {
    await admin.schema("td").from("semaines").delete().ilike("libelle", `${PREFIXE}%`);
  });

  // Timeout étendu (3e argument) : nombreux aller-retours réseau séquentiels, dépasse les 5s par défaut de vitest.
  it("arbitrage : valide le candidat choisi, refuse les concurrents sur le même créneau ET les candidatures en conflit horaire du même professeur (Règle A)", async () => {
    const libelle = `${PREFIXE} arbitrage`;
    expect((await creerSemaineTD({ libelle, dateDebut: dateTd })).error).toBeUndefined();

    const { data: semaine } = await admin.schema("td").from("semaines").select("id").eq("libelle", libelle).single();
    const semaineId = semaine!.id;

    expect(
      (await creerCreneauTD({ semaineId, classeId: classeAId, matiereId, dateTd, heureDebut: "14:00", heureFin: "16:00", montantPrevu: 5000 }))
        .error
    ).toBeUndefined();
    expect(
      (await creerCreneauTD({ semaineId, classeId: classeBId, matiereId, dateTd, heureDebut: "14:00", heureFin: "16:00", montantPrevu: 5000 }))
        .error
    ).toBeUndefined();
    // Chevauchement réel avec creneauA (14h-16h) malgré une heure_debut différente —
    // reproduit précisément le cas que l'ancienne Règle A (égalité stricte de
    // heure_debut) ne détectait pas (sql/016_td_arbitrage_chevauchement.sql).
    expect(
      (await creerCreneauTD({ semaineId, classeId: classeBId, matiereId, dateTd, heureDebut: "15:00", heureFin: "17:00", montantPrevu: 5000 }))
        .error
    ).toBeUndefined();

    const { data: creneauA } = await admin.schema("td").from("creneaux").select("id").eq("semaine_id", semaineId).eq("classe_id", classeAId).single();
    const { data: creneauB } = await admin
      .schema("td")
      .from("creneaux")
      .select("id")
      .eq("semaine_id", semaineId)
      .eq("classe_id", classeBId)
      .eq("heure_debut", "14:00:00")
      .single();
    const { data: creneauC } = await admin
      .schema("td")
      .from("creneaux")
      .select("id")
      .eq("semaine_id", semaineId)
      .eq("heure_debut", "15:00:00")
      .single();
    const creneauAId = creneauA!.id;
    const creneauBId = creneauB!.id;
    const creneauCId = creneauC!.id;

    expect((await publierSemaineTD(semaineId)).error).toBeUndefined();

    const { data: creneauApresPublication } = await admin.schema("td").from("creneaux").select("statut_creneau").eq("id", creneauAId).single();
    expect(creneauApresPublication!.statut_creneau).toBe("public");

    currentProfesseurId = prof1Id;
    expect((await soumettrePostulationTD(creneauAId)).error).toBeUndefined();
    expect((await soumettrePostulationTD(creneauBId)).error).toBeUndefined();
    expect((await soumettrePostulationTD(creneauCId)).error).toBeUndefined();
    // Contrainte UNIQUE(creneau_id, professeur_id) — vérifie le message lisible sur la vraie erreur Postgres 23505.
    expect((await soumettrePostulationTD(creneauAId)).error).toBe("Vous avez déjà postulé sur ce créneau.");

    currentProfesseurId = prof2Id;
    expect((await soumettrePostulationTD(creneauAId)).error).toBeUndefined();

    const arbitrer = await traiterArbitrageTD(creneauAId, prof1Id);
    expect(arbitrer.error).toBeUndefined();

    const { data: postulations } = await admin
      .schema("td")
      .from("postulations")
      .select("professeur_id, creneau_id, statut_validation")
      .in("creneau_id", [creneauAId, creneauBId, creneauCId]);
    const statut = (creneauId: number, professeurId: number) =>
      postulations!.find((p) => p.creneau_id === creneauId && p.professeur_id === professeurId)!.statut_validation;

    expect(statut(creneauAId, prof1Id)).toBe("Valide"); // candidat choisi
    expect(statut(creneauAId, prof2Id)).toBe("Refuse"); // concurrent sur le même créneau
    expect(statut(creneauBId, prof1Id)).toBe("Refuse"); // Règle A : même prof, même horaire exacte, refusé automatiquement
    expect(statut(creneauCId, prof1Id)).toBe("Refuse"); // Règle A corrigée : chevauchement réel (15h-17h chevauche 14h-16h) malgré une heure_debut différente

    const { data: creneauAApresArbitrage } = await admin.schema("td").from("creneaux").select("statut_creneau").eq("id", creneauAId).single();
    const { data: creneauBApresArbitrage } = await admin.schema("td").from("creneaux").select("statut_creneau").eq("id", creneauBId).single();
    expect(creneauAApresArbitrage!.statut_creneau).toBe("cloture"); // arbitré
    expect(creneauBApresArbitrage!.statut_creneau).toBe("public"); // non touché par l'arbitrage de A, seule sa candidature l'est
  }, 20000);

  it("cloturerSemaineTD refuse les candidatures en attente et clôture les créneaux publics restants d'une semaine", async () => {
    const libelle = `${PREFIXE} cloture`;
    expect((await creerSemaineTD({ libelle, dateDebut: dateTd })).error).toBeUndefined();

    const { data: semaine } = await admin.schema("td").from("semaines").select("id").eq("libelle", libelle).single();
    const semaineId = semaine!.id;

    expect(
      (await creerCreneauTD({ semaineId, classeId: classeAId, matiereId, dateTd, heureDebut: "10:00", heureFin: "12:00", montantPrevu: 4000 }))
        .error
    ).toBeUndefined();

    const { data: creneau } = await admin.schema("td").from("creneaux").select("id").eq("semaine_id", semaineId).single();
    const creneauId = creneau!.id;

    expect((await publierSemaineTD(semaineId)).error).toBeUndefined();

    currentProfesseurId = prof1Id;
    expect((await soumettrePostulationTD(creneauId)).error).toBeUndefined();

    expect((await cloturerSemaineTD(semaineId)).error).toBeUndefined();

    const { data: semaineApresCloture } = await admin.schema("td").from("semaines").select("statut").eq("id", semaineId).single();
    expect(semaineApresCloture!.statut).toBe("cloturee");

    const { data: creneauApresCloture } = await admin.schema("td").from("creneaux").select("statut_creneau").eq("id", creneauId).single();
    expect(creneauApresCloture!.statut_creneau).toBe("cloture");

    const { data: postulation } = await admin.schema("td").from("postulations").select("statut_validation").eq("creneau_id", creneauId).single();
    expect(postulation!.statut_validation).toBe("Refuse");
  });
});
