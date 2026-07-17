import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { EleveForm } from "@/components/admin/eleves/EleveForm";

export default async function ModifierElevePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: sites }, { data: eleve }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase
      .from("eleves")
      .select("id, matricule, nom, prenoms, contact_parent, college, option_m, classe_id, classes(site_id)")
      .eq("id", params.id)
      .single(),
  ]);

  if (!eleve) notFound();

  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;

  return (
    <div>
      <PageHeader title={`Modifier ${eleve.nom} ${eleve.prenoms}`} />
      <EleveForm
        sites={sites ?? []}
        mode="edit"
        eleveId={eleve.id}
        matricule={eleve.matricule}
        initialValues={{
          nom: eleve.nom,
          prenoms: eleve.prenoms,
          contactParent: eleve.contact_parent,
          siteId,
          classeId: eleve.classe_id,
          college: eleve.college,
          optionM: eleve.option_m,
        }}
      />
    </div>
  );
}
