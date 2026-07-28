/**
 * Script one-shot — crée le bucket Storage privé "galerie-admin" (archive
 * interne de fichiers précieux, accessible uniquement coordonnateur/
 * comptable/superviseur — voir sql/008_galerie_admin.sql pour les policies).
 * Distinct du bucket public "galerie" prévu par GSR_ARCHITECTURE.md §2.1
 * pour la galerie vitrine (non configuré, hors scope pour l'instant).
 *
 * Usage :
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/setup-storage-galerie-admin.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const BUCKET = "galerie-admin";

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(listError.message);

  if (buckets?.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" existe déjà.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error) throw new Error(error.message);

  console.log(`Bucket "${BUCKET}" créé (privé, images uniquement, 10MB max).`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
