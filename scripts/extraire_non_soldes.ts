import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// Gestion du mode d'environnement : --client ou --prod pour cibler l'instance client
const isClient = process.argv.includes("--client") || process.argv.includes("--prod");

const envFileName = isClient ? ".env.client.local" : ".env.local";
const envPaths = [
  path.resolve(__dirname, `../${envFileName}`),
  path.resolve(__dirname, `../../gsr/${envFileName}`),
  path.resolve(process.cwd(), envFileName),
  path.resolve(process.cwd(), `gsr/${envFileName}`),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    break;
  }
}
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erreur: Supabase URL ou clé introuvable dans l'environnement.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MOIS_SCOLAIRES = [
  "Octobre",
  "Novembre",
  "Décembre",
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
] as const;

function getMoisCourant(date: Date = new Date()): string {
  const index = [9, 10, 11, 0, 1, 2, 3, 4].indexOf(date.getMonth());
  return index === -1 ? "Novembre" : MOIS_SCOLAIRES[index];
}

async function fetchAllWithPagination<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: any; error: any }>
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  let all: T[] = [];
  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function main() {
  console.log(`=== Extraction des élèves non soldés [${isClient ? "PROD / CLIENT" : "TEST / DEV"}] ===`);

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const emailArg = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1];
    const passArg = process.argv.find((a) => a.startsWith("--password="))?.split("=")[1];
    if (emailArg && passArg) {
      console.log(`Authentification en tant que staff (${emailArg})...`);
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: emailArg,
        password: passArg,
      });
      if (authErr) {
        console.error("Échec de connexion:", authErr.message);
        process.exit(1);
      }
      console.log("Authentification staff réussie !");
    } else {
      console.warn("Remarque : Aucune SUPABASE_SERVICE_ROLE_KEY détectée. Utilisation de la clé anon.");
    }
  }

  // 1. Année scolaire en cours
  const { data: anneeEnCours, error: errAnnee } = await supabase
    .from("annees_scolaires")
    .select("id, libelle, date_debut, date_fin")
    .eq("statut", "en_cours")
    .maybeSingle();

  if (errAnnee || !anneeEnCours) {
    console.error("Erreur lors de la récupération de l'année scolaire en cours:", errAnnee);
    process.exit(1);
  }

  const moisCible = getMoisCourant();
  console.log(`Année scolaire : ${anneeEnCours.libelle} (ID: ${anneeEnCours.id})`);
  console.log(`Mois ciblé      : ${moisCible}`);

  // 2. Frais TD par classe
  const { data: fraisTd, error: errFrais } = await supabase
    .from("frais_td")
    .select("classe_id, montant");

  if (errFrais) {
    console.error("Erreur lors de la récupération des frais TD:", errFrais);
    process.exit(1);
  }
  const montantParClasse = new Map<number, number>(
    (fraisTd ?? []).map((f) => [f.classe_id, Number(f.montant)])
  );

  // 3. Exonérations pour le mois
  const { data: exonerations, error: errExo } = await supabase
    .from("mois_exoneres")
    .select("eleve_id")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("mois_souscription", moisCible);

  if (errExo) {
    console.error("Erreur lors de la récupération des exonérations:", errExo);
    process.exit(1);
  }
  const elevesExoneres = new Set<number>((exonerations ?? []).map((e) => e.eleve_id));

  // 4. Paiements du mois (avec pagination pour garantir l'exhaustivité)
  console.log("Récupération des paiements enregistrés...");
  const paiements = await fetchAllWithPagination<{ eleve_id: number; montant_paye: number }>((from, to) =>
    supabase
      .from("paiements")
      .select("eleve_id, montant_paye")
      .eq("annee_scolaire_id", anneeEnCours.id)
      .eq("mois_souscription", moisCible)
      .range(from, to)
  );

  const totalPayeParEleve = new Map<number, number>();
  for (const p of paiements) {
    const prev = totalPayeParEleve.get(p.eleve_id) ?? 0;
    totalPayeParEleve.set(p.eleve_id, prev + Number(p.montant_paye));
  }

  // 5. Élèves actifs
  console.log("Récupération des élèves actifs...");
  interface EleveRaw {
    id: number;
    matricule: string;
    nom: string;
    prenoms: string;
    contact_parent: string | null;
    classe_id: number;
    classes: {
      nom_classe: string;
      site_id: number;
      sites: { nom_site: string } | null;
    } | null;
  }

  const elevesActifs = await fetchAllWithPagination<EleveRaw>((from, to) =>
    supabase
      .from("eleves")
      .select("id, matricule, nom, prenoms, contact_parent, classe_id, classes!inner(nom_classe, site_id, sites(nom_site))")
      .eq("statut", "actif")
      .order("nom")
      .range(from, to)
  );

  console.log(`Nombre total d'élèves actifs trouvés : ${elevesActifs.length}`);

  // 6. Filtrer les non soldés
  interface LigneExcel {
    Site: string;
    Classe: string;
    Matricule: string;
    "Nom & Prénoms": string;
    "Montant déjà versé (FCFA)": number;
    "Reste à solder (FCFA)": number;
    "Contact Parent": string;
  }

  const lignesNonSoldes: LigneExcel[] = [];
  let totalSoldesOuExoneres = 0;

  for (const el of elevesActifs) {
    if (elevesExoneres.has(el.id)) {
      totalSoldesOuExoneres++;
      continue;
    }

    const montantAttendu = montantParClasse.get(el.classe_id);
    if (montantAttendu === undefined) {
      // Classe sans tarif défini dans frais_td
      continue;
    }

    const dejaPaye = totalPayeParEleve.get(el.id) ?? 0;
    const resteDu = Math.max(0, montantAttendu - dejaPaye);

    if (resteDu > 0) {
      const siteNom = el.classes?.sites?.nom_site ?? "Non assigné";
      const classeNom = el.classes?.nom_classe ?? "—";
      const contact = el.contact_parent?.trim() || "Non renseigné";

      lignesNonSoldes.push({
        Site: siteNom,
        Classe: classeNom,
        Matricule: el.matricule,
        "Nom & Prénoms": `${el.nom.toUpperCase()} ${el.prenoms}`,
        "Montant déjà versé (FCFA)": dejaPaye,
        "Reste à solder (FCFA)": resteDu,
        "Contact Parent": contact,
      });
    } else {
      totalSoldesOuExoneres++;
    }
  }

  // Tri par Site, puis par Classe, puis par Nom
  lignesNonSoldes.sort((a, b) => {
    if (a.Site !== b.Site) return a.Site.localeCompare(b.Site);
    if (a.Classe !== b.Classe) return a.Classe.localeCompare(b.Classe);
    return a["Nom & Prénoms"].localeCompare(b["Nom & Prénoms"]);
  });

  console.log(`Élèves à jour / exonérés : ${totalSoldesOuExoneres}`);
  console.log(`Élèves non encore soldés  : ${lignesNonSoldes.length}`);

  // 7. Génération du classeur Excel
  const titre = `LISTE DES ÉLÈVES NON SOLDÉS — ${moisCible.toUpperCase()} ${new Date().getFullYear()} (RAPPEL AVANT ÉCHÉANCE DU 15)`;
  const feuille = XLSX.utils.aoa_to_sheet([
    [titre],
    [`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")} — Année scolaire : ${anneeEnCours.libelle}`],
    [], // ligne vide avant le tableau
  ]);

  XLSX.utils.sheet_add_json(feuille, lignesNonSoldes, { origin: "A4" });

  // Calibrage des largeurs de colonnes pour une lisibilité optimale
  feuille["!cols"] = [
    { wch: 22 }, // Site
    { wch: 16 }, // Classe
    { wch: 16 }, // Matricule
    { wch: 34 }, // Nom & Prénoms
    { wch: 26 }, // Montant déjà versé (FCFA)
    { wch: 24 }, // Reste à solder (FCFA)
    { wch: 22 }, // Contact Parent
  ];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, `Non Soldés ${moisCible}`);

  const nomFichier = `Non_Soldes_${moisCible}_${new Date().getFullYear()}.xlsx`;
  const cheminProjet = path.resolve(__dirname, `../../${nomFichier}`);
  const cheminBureau = path.resolve(process.env.HOME || "/home/uriel_axel_houegbe", `Bureau/${nomFichier}`);

  XLSX.writeFile(classeur, cheminProjet);
  console.log(`\n-> Fichier disponible dans le projet : ${cheminProjet}`);

  try {
    if (fs.existsSync(path.dirname(cheminBureau)) && path.dirname(cheminBureau) !== cheminProjet) {
      XLSX.writeFile(classeur, cheminBureau);
      console.log(`-> Fichier disponible sur le Bureau  : ${cheminBureau}`);
    }
  } catch (err) {
    // Si écriture sur Bureau échoue, le fichier projet reste disponible
  }

  // Résumé par site
  const statsParSite = new Map<string, number>();
  for (const l of lignesNonSoldes) {
    statsParSite.set(l.Site, (statsParSite.get(l.Site) ?? 0) + 1);
  }
  console.log("\n--- Répartition par site ---");
  for (const [site, nb] of statsParSite.entries()) {
    console.log(`- ${site} : ${nb} élève(s)`);
  }
  console.log("=== Extraction terminée avec succès ===");
}

main().catch((err) => {
  console.error("Erreur inattendue:", err);
  process.exit(1);
});
