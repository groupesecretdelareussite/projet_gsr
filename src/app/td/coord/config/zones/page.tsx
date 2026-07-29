import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { EntiteSimpleTD } from "@/components/td/EntiteSimpleTD";
import { creerZoneTD, modifierZoneTD, supprimerZoneTD } from "@/actions/td-config";

export default async function ZonesTDPage() {
  await getUserScope(createClient());
  const supabaseAdmin = createServiceRoleClient();
  const { data } = await supabaseAdmin.schema("td").from("zones").select("id, nom_zone").order("nom_zone");
  const rows = (data ?? []).map((z) => ({ id: z.id, nom: z.nom_zone }));

  return (
    <EntiteSimpleTD
      titre="Zone"
      titrePage="Zones"
      colonneLabel="Nom de la zone"
      rows={rows}
      onCreer={creerZoneTD}
      onModifier={modifierZoneTD}
      onSupprimer={supprimerZoneTD}
    />
  );
}
