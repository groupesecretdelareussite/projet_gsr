import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { EleveForm } from "@/components/admin/eleves/EleveForm";

/**
 * Audit 2026-08-14 : cette page n'appelait pas `getUserScope()` du tout —
 * n'importe quel compte connecté pouvait consulter et modifier le contact
 * parent d'un élève par URL directe, alors que chef_site/secretaire ne
 * doivent jamais voir cette donnée (même périmètre que `peutGerer` sur
 * eleves/liste).
 */
export default async function ModifierElevePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Modifier un élève" />
        <EmptyState icon={Pencil} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: sites }, { data: eleve }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase
      .from("eleves")
      .select("id, matricule, nom, prenoms, contact_parent, contact_parent_2, college, option_m, classe_id, classes(site_id)")
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
          contactParent2: eleve.contact_parent_2,
          siteId,
          classeId: eleve.classe_id,
          college: eleve.college,
          optionM: eleve.option_m,
        }}
      />
    </div>
  );
}
