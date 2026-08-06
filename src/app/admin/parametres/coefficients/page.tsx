import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { CoefficientsTable } from "@/components/admin/parametres/CoefficientsTable";

/**
 * Réservé au coordonnateur (même garde que Données scolaires/Utilisateurs).
 * Sert de configuration pour Notes > Moyennes : absence de ligne dans
 * `coefficients` = "non configuré", affiché explicitement plutôt que
 * silencieusement traité comme 1 (qui est une valeur réelle possible).
 */
export default async function CoefficientsPage(props: { searchParams: Promise<{ site_id?: string; classe_id?: string }> }) {
  const searchParams = await props.searchParams;
  const scope = await getUserScope(await createClient());

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Coefficients" />
        <EmptyState icon={Calculator} title="Non autorisé" description="Cette page est réservée au coordonnateur." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  const [{ data: sites }, { data: classes }, { data: matieres }] = await Promise.all([
    supabaseAdmin.from("sites").select("id, nom_site").order("nom_site"),
    supabaseAdmin.from("classes").select("id, nom_classe, site_id").order("ordre"),
    supabaseAdmin.from("matieres").select("id, nom").eq("actif", true).order("ordre"),
  ]);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = searchParams.site_id
    ? (classes ?? []).filter((c) => String(c.site_id) === searchParams.site_id)
    : classes ?? [];

  const classeId = searchParams.classe_id ? Number(searchParams.classe_id) : undefined;
  const classeSelectionnee = (classes ?? []).find((c) => c.id === classeId);

  let coefficientsExistants: { matiere_id: number; coefficient: number }[] = [];
  if (classeId) {
    const { data } = await supabaseAdmin.from("coefficients").select("matiere_id, coefficient").eq("classe_id", classeId);
    coefficientsExistants = data ?? [];
  }
  const coefficientParMatiere = new Map(coefficientsExistants.map((c) => [c.matiere_id, Number(c.coefficient)]));

  return (
    <div>
      <PageHeader
        title="Coefficients"
        subtitle="Utilisés par Notes > Moyennes pour pondérer la moyenne générale — diffèrent d'une classe à l'autre"
      />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-xl">
        <select name="site_id" defaultValue={searchParams.site_id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Tous les sites</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom_site}
            </option>
          ))}
        </select>
        <select name="classe_id" defaultValue={searchParams.classe_id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Choisir une classe</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {searchParams.site_id ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      {!classeSelectionnee ? (
        <EmptyState icon={Calculator} title="Choisissez une classe" description="Sélectionnez une classe ci-dessus pour configurer ses coefficients." />
      ) : (matieres ?? []).length === 0 ? (
        <EmptyState icon={Calculator} title="Aucune matière active" description="Activez au moins une matière dans les données de référence." />
      ) : (
        <CoefficientsTable
          classeId={classeSelectionnee.id}
          matieres={(matieres ?? []).map((m) => ({
            matiereId: m.id,
            nomMatiere: m.nom,
            coefficientActuel: coefficientParMatiere.get(m.id) ?? null,
          }))}
        />
      )}
    </div>
  );
}
