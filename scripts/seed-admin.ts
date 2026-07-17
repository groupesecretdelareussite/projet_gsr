/**
 * Script one-shot — crée le tout premier compte coordonnateur.
 * Voir GSR_ARCHITECTURE.md §4 (table `users`, note v2.1) : aucun compte
 * hardcodé, aucun bypass — ce script crée le compte exactement comme le
 * ferait la page Paramètres > Utilisateurs plus tard.
 *
 * Usage :
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   SEED_ADMIN_USERNAME=admin \
 *   SEED_ADMIN_EMAIL=urielaxelhouegbe@gmail.com \
 *   SEED_ADMIN_PASSWORD=xxx \
 *   npx tsx scripts/seed-admin.ts
 *
 * SEED_ADMIN_EMAIL par défaut : email du développeur (le temps du
 * développement/tests) — à remplacer par un compte définitif avant la
 * livraison finale (voir la note v2.1 dans GSR_ARCHITECTURE.md §4).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
const email = process.env.SEED_ADMIN_EMAIL ?? "urielaxelhouegbe@gmail.com";
const password = process.env.SEED_ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies (clé service role : Dashboard Supabase > Project Settings > API)."
  );
}
if (!password) {
  throw new Error("SEED_ADMIN_PASSWORD doit être défini (mot de passe initial du compte coordonnateur).");
}

async function main() {
  const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    throw new Error(`Échec de création du compte Supabase Auth : ${authError?.message}`);
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: authUser.user.id,
    username,
    email,
    role: "coordonnateur",
    site_id: null,
    actif: true,
  });

  if (insertError) {
    // Rollback du compte Auth si l'INSERT dans public.users échoue, pour ne
    // pas laisser un compte Auth orphelin sans ligne applicative.
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Échec de création de la ligne public.users : ${insertError.message}`);
  }

  console.log(`Compte coordonnateur créé : username="${username}" email="${email}"`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
