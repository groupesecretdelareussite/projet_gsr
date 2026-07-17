import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { EleveForm } from "@/components/admin/eleves/EleveForm";

export default async function InscriptionElevePage() {
  const supabase = createClient();
  const { data: sites } = await supabase.from("sites").select("id, nom_site").order("nom_site");

  return (
    <div>
      <PageHeader title="Inscrire un élève" subtitle="Le matricule est généré automatiquement" />
      <EleveForm sites={sites ?? []} mode="create" />
    </div>
  );
}
