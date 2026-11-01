import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { RegularisationClient } from "@/components/admin/eleves/RegularisationClient";
import { getElevesSuspendusDefautPaiement } from "@/actions/regulariser-suspension";

export const dynamic = "force-dynamic";

export default async function RegularisationSuspensionsPage() {
  const supabase = await createClient();
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    redirect("/admin/login");
  }

  // Seuls le coordonnateur, le comptable et le superviseur sont autorisés
  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Régularisation des suspensions" />
        <EmptyState
          icon={AlertTriangle}
          title="Non autorisé"
          description="Cette page est réservée aux gestionnaires financiers et à la coordination."
        />
      </div>
    );
  }

  const { data: elevesInitiaux, error } = await getElevesSuspendusDefautPaiement();

  if (error) {
    return (
      <div>
        <PageHeader title="Régularisation des suspensions" />
        <EmptyState
          icon={AlertTriangle}
          title="Erreur de chargement"
          description={`Impossible de charger les dossiers de suspension : ${error}`}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2">
      <RegularisationClient elevesInitiaux={elevesInitiaux ?? []} />
    </div>
  );
}
