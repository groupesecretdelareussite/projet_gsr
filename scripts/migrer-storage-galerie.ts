/**
 * Script one-shot — copie tous les fichiers du bucket public "galerie"
 * (photos vitrine réelles) d'un projet Supabase source vers un projet
 * Supabase destination. Utilisé pour migrer le projet de test vers le
 * projet dédié au client (voir discussion 2026-08-07).
 *
 * Parcourt récursivement l'arborescence (vitrine/accueil, vitrine/sites,
 * vitrine/apropos, vitrine/actualites, vitrine/galerie/<categories>, etc.)
 * sans dépendre d'une liste de dossiers codée en dur.
 *
 * Idempotent : upload en `upsert: true`, relançable sans risque si une
 * exécution précédente s'est arrêtée en cours de route.
 *
 * Usage :
 *   SOURCE_SUPABASE_URL=xxx SOURCE_SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   DEST_SUPABASE_URL=xxx DEST_SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/migrer-storage-galerie.ts
 *
 * Optionnel : BUCKET=nom_du_bucket (défaut "galerie").
 */
import { createClient } from "@supabase/supabase-js";

const sourceUrl = process.env.SOURCE_SUPABASE_URL;
const sourceKey = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const destUrl = process.env.DEST_SUPABASE_URL;
const destKey = process.env.DEST_SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.BUCKET ?? "galerie";

if (!sourceUrl || !sourceKey || !destUrl || !destKey) {
  throw new Error(
    "SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY, DEST_SUPABASE_URL et DEST_SUPABASE_SERVICE_ROLE_KEY doivent toutes être définies."
  );
}

const source = createClient(sourceUrl, sourceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const dest = createClient(destUrl, destKey, { auth: { autoRefreshToken: false, persistSession: false } });

/** Liste récursivement tous les chemins de fichiers (pas les dossiers) sous `prefix`. */
async function listerFichiers(prefix: string): Promise<string[]> {
  const { data, error } = await source.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`Échec de listing "${prefix}" : ${error.message}`);

  const fichiers: string[] = [];
  for (const entree of data ?? []) {
    const chemin = prefix ? `${prefix}/${entree.name}` : entree.name;
    // Un dossier n'a pas de métadonnées de fichier (id null côté API Storage).
    if (entree.id === null) {
      fichiers.push(...(await listerFichiers(chemin)));
    } else {
      fichiers.push(chemin);
    }
  }
  return fichiers;
}

async function main() {
  console.log(`Listing du bucket "${bucket}" sur le projet source...`);
  const fichiers = await listerFichiers("");
  console.log(`${fichiers.length} fichier(s) trouvé(s).`);

  const echecs: string[] = [];
  let copies = 0;

  for (const chemin of fichiers) {
    const { data: blob, error: downloadError } = await source.storage.from(bucket).download(chemin);
    if (downloadError || !blob) {
      console.error(`✗ Téléchargement échoué : ${chemin} — ${downloadError?.message}`);
      echecs.push(chemin);
      continue;
    }

    const { error: uploadError } = await dest.storage.from(bucket).upload(chemin, blob, {
      contentType: blob.type || undefined,
      upsert: true,
    });
    if (uploadError) {
      console.error(`✗ Upload échoué : ${chemin} — ${uploadError.message}`);
      echecs.push(chemin);
      continue;
    }

    copies++;
    console.log(`✓ ${chemin}`);
  }

  console.log(`\n${copies}/${fichiers.length} fichier(s) copié(s).`);
  if (echecs.length > 0) {
    console.log(`Échecs (${echecs.length}) :`);
    echecs.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
