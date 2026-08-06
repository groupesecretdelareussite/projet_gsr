import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { EntiteSimpleTD } from "@/components/td/EntiteSimpleTD";
import { creerClasseTD, modifierClasseTD, supprimerClasseTD } from "@/actions/td-config";

export default async function ClassesTDPage() {
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();
  const { data } = await supabaseAdmin.schema("td").from("classes_td").select("id, nom_classe").order("nom_classe");
  const rows = (data ?? []).map((c) => ({ id: c.id, nom: c.nom_classe }));

  return (
    <EntiteSimpleTD
      titre="Classe TD"
      titrePage="Classes TD"
      colonneLabel="Nom de la classe"
      rows={rows}
      onCreer={creerClasseTD}
      onModifier={modifierClasseTD}
      onSupprimer={supprimerClasseTD}
    />
  );
}
