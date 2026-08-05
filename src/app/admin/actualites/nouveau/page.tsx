import { Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { ActualiteForm } from "@/components/admin/actualites/ActualiteForm";

export default async function NouvelleActualitePage() {
  const supabase = createClient();
  const scope = await getUserScope(supabase);

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Nouvel article" />
        <EmptyState icon={Newspaper} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nouvel article" subtitle="Sera visible sur la page Actualités du site public une fois publié" />
      <ActualiteForm />
    </div>
  );
}
