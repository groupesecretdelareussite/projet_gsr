import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { EntiteSimpleTD } from "@/components/td/EntiteSimpleTD";
import { creerMatiereTD, modifierMatiereTD, supprimerMatiereTD } from "@/actions/td-config";

export default async function MatieresTDPage() {
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();
  const { data } = await supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere");
  const rows = (data ?? []).map((m) => ({ id: m.id, nom: m.nom_matiere }));

  return (
    <EntiteSimpleTD
      titre="Matière TD"
      titrePage="Matières TD"
      colonneLabel="Nom de la matière"
      rows={rows}
      onCreer={creerMatiereTD}
      onModifier={modifierMatiereTD}
      onSupprimer={supprimerMatiereTD}
    />
  );
}
