import { UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PresencesNav } from "@/components/admin/presences/PresencesNav";
import { RetardataireForm } from "@/components/admin/presences/RetardataireForm";

export default async function RetardatairesPage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Retardataires" />
        <EmptyState icon={UserCheck} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Retardataires" subtitle="Marquer présent un élève arrivé après l'appel" />
      <PresencesNav active="retardataires" />
      <RetardataireForm />
    </div>
  );
}
