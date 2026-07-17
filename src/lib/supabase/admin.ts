import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client service role — bypass RLS entièrement (§5.5 GSR_ARCHITECTURE.md).
 * Jamais importé depuis un Client Component : uniquement `actions/*.ts` et
 * `app/api/*` (Route Handlers), qui s'exécutent exclusivement côté serveur.
 * Chaque Server Action qui l'utilise DOIT appeler getUserScope() avant toute
 * lecture/écriture — RLS ne joue ici aucun rôle de garde-fou.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
