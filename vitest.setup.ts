import { config } from "dotenv";

// §Niveau 3 — .env.local fournit les clés Supabase déjà utilisées en dev ;
// .env.test.local (gitignoré comme .env.local) fournit les identifiants des
// comptes de test créés pour les tests d'intégration.
config({ path: ".env.local" });
config({ path: ".env.test.local" });
