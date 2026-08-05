import { cache } from "@/lib/react-cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Mémoïsé par requête (React `cache()`) : `admin/layout.tsx` ET chaque
 * `page.tsx` appellent `createClient()` puis `getUserScope()` indépendamment
 * — sans ce cache, ça déclenchait 2x `auth.getUser()` + 2x SELECT `users`
 * (réseau vers Supabase) à chaque navigation, doublé pour rien. `cache()`
 * ne fuit jamais entre requêtes/utilisateurs différents, seulement au sein
 * d'un même rendu serveur.
 */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : ignorable, le middleware
            // rafraîchit déjà la session à chaque requête.
          }
        },
      },
    }
  );
});
