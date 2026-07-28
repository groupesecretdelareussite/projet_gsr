/**
 * Script de vérification manuelle — exécute la même logique que la route
 * cron (`src/app/api/cron/suspension-auto/route.ts`) avec une date simulée,
 * puisque le calendrier réel actuel ne traverse pas l'année scolaire
 * Oct-Mai. Utile pour vérifier le comportement contre le jeu de données
 * démo (`scripts/seed-demo-data.ts`) sans attendre octobre.
 *
 * ATTENTION : ce n'est pas un dry-run — les élèves en défaut de paiement
 * pour le mois vérifié sont réellement suspendus en base.
 *
 * Usage :
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   SIMULE_DATE=2026-11-01 npx tsx scripts/test-suspension-auto.ts
 *
 * SIMULE_DATE par défaut : 2026-11-01 (vérifie Octobre, premier mois du jeu
 * de données démo).
 */
import { executerSuspensionAutomatique } from "@/lib/suspension-auto";

const dateSimulee = process.env.SIMULE_DATE ?? "2026-11-01";

async function main() {
  console.log(`Simulation du cron au ${dateSimulee}...`);
  const resultat = await executerSuspensionAutomatique(new Date(dateSimulee));

  if (!resultat.moisVerifie) {
    console.log("Aucune exécution : cette date ne vérifie aucun mois scolaire (hors Octobre-Mai).");
    return;
  }

  console.log(`Mois vérifié : ${resultat.moisVerifie} (année scolaire id=${resultat.anneeScolaireId})`);
  console.log(`${resultat.suspendus.length} élève(s) suspendu(s) :`);
  for (const e of resultat.suspendus) {
    console.log(`  - ${e.nom} ${e.prenoms} (${e.matricule}) — ${e.montantDu} F restants`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
