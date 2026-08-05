import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client service role — bypass RLS entièrement (§5.5 GSR_ARCHITECTURE.md).
 * `import "server-only"` fait planter le build si jamais importé depuis un
 * Client Component. Utilisé depuis `actions/*.ts`, `app/api/*` (Route
 * Handlers) et aussi directement par des `page.tsx` (Server Components) pour
 * des lectures — peu importe l'endroit, quiconque l'utilise DOIT appeler
 * getUserScope() avant toute lecture/écriture : RLS ne joue ici aucun rôle
 * de garde-fou.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
