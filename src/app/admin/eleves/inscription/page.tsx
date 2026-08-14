import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EleveForm } from "@/components/admin/eleves/EleveForm";
import { ImporterElevesSection } from "@/components/admin/eleves/ImporterElevesSection";

const ROLES_IMPORT = ["coordonnateur", "comptable", "superviseur"];

export default async function InscriptionElevePage() {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const { data: sites } = await supabase.from("sites").select("id, nom_site").order("nom_site");

  return (
    <div>
      <PageHeader title="Inscrire un élève" subtitle="Le matricule est généré automatiquement" />
      <EleveForm sites={sites ?? []} mode="create" />
      {ROLES_IMPORT.includes(scope.role) && <ImporterElevesSection />}
    </div>
  );
}
