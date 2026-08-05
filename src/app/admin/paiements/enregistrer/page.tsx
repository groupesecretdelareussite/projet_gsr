import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EnregistrerPaiementForm } from "@/components/admin/paiements/EnregistrerPaiementForm";

export default async function EnregistrerPaiementPage() {
  const scope = await getUserScope(await createClient());

  return (
    <div>
      <PageHeader title="Enregistrer un paiement" subtitle="Le reste dû est vérifié automatiquement" />
      <PaiementsNav active="enregistrer" role={scope.role} />
      <EnregistrerPaiementForm />
    </div>
  );
}
