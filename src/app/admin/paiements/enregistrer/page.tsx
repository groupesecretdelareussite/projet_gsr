import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EnregistrerPaiementForm } from "@/components/admin/paiements/EnregistrerPaiementForm";

/**
 * §discussion 2026-08-16 — chef_site voit désormais Historique/À jour/En
 * retard (lecture seule), mais pas Enregistrer, qui reste coordonnateur/
 * comptable/superviseur. Un chef_site qui clique "Paiements" dans le menu
 * atterrit ici en premier (seul href possible pour l'entrée de nav) — on le
 * redirige vers Historique plutôt que de lui montrer "Non autorisé".
 */
export default async function EnregistrerPaiementPage() {
  const scope = await getUserScope(await createClient());

  if (scope.role === "chef_site") {
    redirect("/admin/paiements/historique");
  }

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Enregistrer un paiement" />
        <EmptyState icon={Wallet} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Enregistrer un paiement" subtitle="Le reste dû est vérifié automatiquement" />
      <PaiementsNav active="enregistrer" role={scope.role} />

      <div className="mb-4 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Un élève a payé en ligne avant la coupure automatique du 1er du mois et a été suspendu par erreur ?
          </span>
        </div>
        <Link
          href="/admin/eleves/suspendus/regularisation"
          className="font-bold text-primary hover:underline shrink-0"
        >
          Accéder à la régularisation de crise &rarr;
        </Link>
      </div>

      <EnregistrerPaiementForm />
    </div>
  );
}
