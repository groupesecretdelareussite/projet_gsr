/**
 * Script one-shot — jeu de données fictives pour tester l'application de
 * bout en bout (élèves, paiements, présences, notes) sans attendre de vraies
 * inscriptions. Rejouable sans risque : supprime d'abord tout ce qu'il a
 * lui-même créé lors d'un run précédent (repéré par `college = 'COLLEGE DEMO'`,
 * jamais une vraie valeur saisie par un utilisateur), puis régénère.
 *
 * Ne touche à rien d'autre (sites/classes/frais_td/matières restent ceux de
 * sql/005_seed.sql). Nécessite qu'un compte coordonnateur existe déjà
 * (voir scripts/seed-admin.ts) — sert de `suspendu_par` pour les suspensions
 * de démonstration.
 *
 * Pour tout supprimer sans relancer un seed : `delete from eleves where
 * college = 'COLLEGE DEMO';` (cascade sur paiements/présences/notes/
 * eleves_suspendus).
 *
 * Usage :
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/seed-demo-data.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies (clé service role : Dashboard Supabase > Project Settings > API)."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COLLEGE_DEMO = "COLLEGE DEMO";
const NB_ELEVES = 50;

const MOIS_SCOLAIRES = ["Octobre", "Novembre", "Decembre", "Janvier", "Fevrier", "Mars", "Avril", "Mai"];
// Mois scolaire -> "année-mois" calendaire réel correspondant (voir sql/005_seed.sql : année 2026-2027, 01/10/2026 -> 31/05/2027).
const PREFIXE_CALENDAIRE: Record<string, string> = {
  Octobre: "2026-10",
  Novembre: "2026-11",
  Decembre: "2026-12",
  Janvier: "2027-01",
  Fevrier: "2027-02",
  Mars: "2027-03",
  Avril: "2027-04",
  Mai: "2027-05",
};

const NOMS = [
  "AGBOTON", "DOSSOU", "HOUNSOU", "ZINSOU", "KPOTIN", "TOSSOU", "AKPOVI", "GBEDO",
  "HOUNGBEDJI", "ADANDE", "SOSSOU", "AHOYO", "GNANSOUNOU", "ALLADATIN", "DEGBEY", "AGOSSOU",
  "HOUNTONDJI", "DAGBA", "KOUDJO", "AGBODJOGBE", "SEDJRO", "HOUNKPE", "AVOCE", "ASSOGBA",
  "DJOSSOU", "HODONOU", "TOKPONOU", "GLELE", "KOTOKO", "BOKO",
];
const PRENOMS_GARCONS = [
  "Comlan", "Kokou", "Kossi", "Divin", "Prince", "Emmanuel", "Rodrigue", "Fabrice",
  "Wilfried", "Junior", "Espoir", "Gilchrist", "Anicet", "Elie", "Marcellin", "Franck",
  "Ulrich", "Prudencio", "Osée", "Yao",
];
const PRENOMS_FILLES = [
  "Chimène", "Rosine", "Bénie", "Grâce", "Merveille", "Prisca", "Sandra", "Reine",
  "Nadège", "Divine", "Christelle", "Sèna", "Edwige", "Judith", "Rachelle", "Sandrine",
  "Bérénice", "Fifamè", "Carole", "Marlène",
];
const PREFIXES_TEL = ["90", "91", "96", "97", "61", "62", "64", "66", "67", "69"];
const RAISONS_SUSPENSION = ["maladie", "renvoi", "autre"] as const;
const MATIERES_CODES_NOTES = ["FR", "MATHS", "ANG"];
const TYPES_NOTE = ["I1", "D1", "Ctrl"];

type Profil = "regulier" | "irregulier" | "critique";

interface ClasseRef {
  id: number;
  site_id: number;
}
interface EleveSeed {
  nom: string;
  prenoms: string;
  contactParent: string;
  classeId: number;
  siteId: number;
  siteInitiale: string;
  profil: Profil;
  suspendu: boolean;
}
interface EleveInsere {
  id: number;
  classeId: number;
  siteId: number;
  profil: Profil;
  suspendu: boolean;
}
interface PaiementRow {
  [key: string]: unknown;
  eleve_id: number;
  mois_souscription: string;
  montant_paye: number;
  date_paiement: string;
  mode_paiement: "MoMo" | "Presentiel";
  annee_scolaire_id: number;
}
interface PresenceRow {
  [key: string]: unknown;
  eleve_id: number;
  date_presence: string;
  site_id: number;
  classe_id: number;
  present: boolean;
  annee_scolaire_id: number;
}
interface NoteRow {
  [key: string]: unknown;
  eleve_id: number;
  matiere_id: number;
  type_note: string;
  valeur: number;
  annee_scolaire_id: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function dateDansLeMois(mois: string, jour?: number): string {
  const j = jour ?? randInt(2, 26);
  return `${PREFIXE_CALENDAIRE[mois]}-${String(j).padStart(2, "0")}`;
}

async function genererMatricule(initiale: string): Promise<string> {
  let matricule: string;
  let collision: number;

  do {
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const aa = String(new Date().getFullYear()).slice(-2);
    const xxxx = randInt(1234, 9876);
    matricule = `${initiale.toUpperCase()}${mm}${aa}${xxxx}`;

    const { count } = await supabase
      .from("eleves")
      .select("*", { count: "exact", head: true })
      .eq("matricule", matricule);

    collision = count ?? 0;
  } while (collision > 0);

  return matricule;
}

async function insertParLots(table: string, rows: Record<string, unknown>[], taille = 200): Promise<void> {
  for (let i = 0; i < rows.length; i += taille) {
    const lot = rows.slice(i, i + taille);
    if (lot.length === 0) continue;
    const { error } = await supabase.from(table).insert(lot);
    if (error) throw new Error(`Échec insertion ${table} : ${error.message}`);
  }
}

async function main() {
  console.log("Nettoyage des données démo d'un run précédent...");
  await supabase.from("eleves").delete().eq("college", COLLEGE_DEMO);

  const [{ data: sites }, { data: classes }, { data: fraisTdRows }, { data: annee }, { data: matieres }, { data: coordo }] =
    await Promise.all([
      supabase.from("sites").select("id, nom_site, initiale"),
      supabase.from("classes").select("id, site_id, ordre").order("site_id").order("ordre"),
      supabase.from("frais_td").select("classe_id, montant"),
      supabase.from("annees_scolaires").select("id, libelle").eq("statut", "en_cours").maybeSingle(),
      supabase.from("matieres").select("id, nom, code"),
      supabase.from("users").select("id").eq("role", "coordonnateur").eq("actif", true).limit(1).maybeSingle(),
    ]);

  if (!sites?.length || !classes?.length || !annee || !matieres?.length || !coordo) {
    throw new Error(
      "Données de référence manquantes (sites/classes/année en cours/matières/coordonnateur). Vérifier que sql/005_seed.sql et scripts/seed-admin.ts ont bien été exécutés."
    );
  }

  const siteParId = new Map(sites.map((s) => [s.id, s]));
  const fraisParClasse = new Map((fraisTdRows ?? []).map((f) => [f.classe_id as number, Number(f.montant)]));
  const classesRef = classes as ClasseRef[];

  const usedNames = new Set<string>();
  const eleves: EleveSeed[] = [];

  for (let i = 0; i < NB_ELEVES; i++) {
    const classe = classesRef[i % classesRef.length];
    const site = siteParId.get(classe.site_id)!;
    const estGarcon = Math.random() < 0.5;

    let nom = "";
    let prenoms = "";
    let cle = "";
    do {
      nom = pick(NOMS);
      const liste = estGarcon ? PRENOMS_GARCONS : PRENOMS_FILLES;
      prenoms = pick(liste);
      if (Math.random() < 0.3) prenoms += ` ${pick(liste)}`;
      cle = `${nom}-${prenoms}`;
    } while (usedNames.has(cle));
    usedNames.add(cle);

    const contactParent = `+22901${pick(PREFIXES_TEL)}${randInt(10, 99)}${randInt(10, 99)}${randInt(10, 99)}`;

    const roll = Math.random();
    const profil: Profil = roll < 0.45 ? "regulier" : roll < 0.75 ? "irregulier" : "critique";

    eleves.push({
      nom,
      prenoms,
      contactParent,
      classeId: classe.id,
      siteId: classe.site_id,
      siteInitiale: site.initiale as string,
      profil,
      suspendu: false,
    });
  }

  // 3 élèves suspendus (dispersés) pour pouvoir tester la vue "suspendu" du portail parent et la liste des suspensions.
  [8, 24, 41].forEach((idx) => {
    if (eleves[idx]) eleves[idx].suspendu = true;
  });

  console.log(`Insertion de ${eleves.length} élèves...`);
  const eleveIds: EleveInsere[] = [];

  for (const e of eleves) {
    const matricule = await genererMatricule(e.siteInitiale);
    const { data, error } = await supabase
      .from("eleves")
      .insert({
        matricule,
        nom: e.nom.toUpperCase(),
        prenoms: e.prenoms,
        contact_parent: e.contactParent,
        classe_id: e.classeId,
        college: COLLEGE_DEMO,
        statut: "actif",
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(`Échec insertion élève ${e.nom} ${e.prenoms} : ${error?.message}`);
    eleveIds.push({ id: data.id as number, classeId: e.classeId, siteId: e.siteId, profil: e.profil, suspendu: e.suspendu });
  }

  const suspendus = eleveIds.filter((e) => e.suspendu);
  if (suspendus.length > 0) {
    await supabase
      .from("eleves")
      .update({ statut: "suspendu" })
      .in(
        "id",
        suspendus.map((s) => s.id)
      );

    await insertParLots(
      "eleves_suspendus",
      suspendus.map((s) => ({
        eleve_id: s.id,
        site_id: s.siteId,
        raison: pick([...RAISONS_SUSPENSION]),
        motif: "Suspension de démonstration — jeu de données de test.",
        montant_du: randInt(2000, 10000),
        suspendu_par: coordo.id,
        annee_scolaire_id: annee.id,
      }))
    );
  }
  console.log(`${suspendus.length} élève(s) marqué(s) suspendu(s).`);

  const paiementsRows: PaiementRow[] = [];
  for (const e of eleveIds) {
    if (e.suspendu) continue;
    const montantAttendu = fraisParClasse.get(e.classeId) ?? 0;
    if (!montantAttendu) continue;

    let moisAPayer: string[];
    if (e.profil === "regulier") moisAPayer = MOIS_SCOLAIRES.filter(() => Math.random() < 0.9);
    else if (e.profil === "irregulier") moisAPayer = MOIS_SCOLAIRES.filter(() => Math.random() < 0.55);
    else moisAPayer = MOIS_SCOLAIRES.slice(0, randInt(1, 2)); // critique : paie 1-2 mois puis s'arrête (retard visible)

    for (const mois of moisAPayer) {
      const complet = e.profil === "critique" ? true : e.profil === "regulier" ? Math.random() < 0.85 : Math.random() < 0.5;
      const montant = complet ? montantAttendu : Math.max(500, Math.round((montantAttendu * randInt(30, 70)) / 100));
      paiementsRows.push({
        eleve_id: e.id,
        mois_souscription: mois,
        montant_paye: montant,
        date_paiement: dateDansLeMois(mois),
        mode_paiement: Math.random() < 0.6 ? "MoMo" : "Presentiel",
        annee_scolaire_id: annee.id,
      });
    }
  }
  console.log(`Insertion de ${paiementsRows.length} paiements...`);
  await insertParLots("paiements", paiementsRows);

  const datesPresence = MOIS_SCOLAIRES.map((m) => dateDansLeMois(m, 10));
  const presencesRows: PresenceRow[] = [];
  for (const e of eleveIds) {
    if (e.suspendu) continue;
    for (const date of datesPresence) {
      if (Math.random() > 0.85) continue; // pas de séance enregistrée ce jour-là pour cet élève
      presencesRows.push({
        eleve_id: e.id,
        date_presence: date,
        site_id: e.siteId,
        classe_id: e.classeId,
        present: Math.random() < 0.9,
        annee_scolaire_id: annee.id,
      });
    }
  }
  console.log(`Insertion de ${presencesRows.length} présences...`);
  await insertParLots("presences", presencesRows);

  const matieresCore = matieres.filter((m) => MATIERES_CODES_NOTES.includes(m.code as string));
  const notesRows: NoteRow[] = [];
  for (const e of eleveIds) {
    if (e.suspendu) continue;
    if (Math.random() > 0.7) continue; // certains élèves n'ont pas encore de notes saisies (réaliste)
    for (const matiere of matieresCore) {
      for (const type of TYPES_NOTE) {
        if (Math.random() > 0.75) continue;
        notesRows.push({
          eleve_id: e.id,
          matiere_id: matiere.id as number,
          type_note: type,
          valeur: Number((randInt(60, 190) / 10).toFixed(2)),
          annee_scolaire_id: annee.id,
        });
      }
    }
  }
  console.log(`Insertion de ${notesRows.length} notes...`);
  await insertParLots("notes", notesRows);

  console.log("Terminé. Pour tout supprimer plus tard : delete from eleves where college = 'COLLEGE DEMO';");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
