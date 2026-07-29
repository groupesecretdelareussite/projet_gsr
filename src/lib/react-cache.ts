import { cache as reactCache } from "react";

/**
 * `cache()` de React (mémoïsation par requête, utilisée dans auth-scope.ts
 * et supabase/server.ts) n'existe que dans la copie de React que Next.js
 * bundle lui-même pour les Server Components — le paquet `react` "nu" tel
 * que Node/Vitest le résout (React 18 stable public) ne l'exporte pas du
 * tout, `import { cache } from "react"` y renvoie `undefined`. Hors du
 * build Next (tests), on retombe sur un simple passe-plat : pas de
 * mémoïsation, mais pas de crash non plus.
 */
export const cache: typeof reactCache =
  typeof reactCache === "function" ? reactCache : (((fn: unknown) => fn) as typeof reactCache);
