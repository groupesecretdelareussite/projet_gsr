import Link from "next/link";
import { Users, UserPlus, UserX as UserXIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionsBar } from "@/components/admin/ActionsBar";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { SuspendreDialog } from "@/components/admin/eleves/SuspendreDialog";
import { ReinitialiserMotDePasseParentDialog } from "@/components/admin/eleves/ReinitialiserMotDePasseParentDialog";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface EleveRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  contact_parent: string;
  option_m: string | null;
  classes: { nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
}

export default async function ListeElevesPage({
  searchParams,
}: {
  searchParams: { site_id?: string; classe_id?: string; college?: string; nom?: string };
}) {
  const supabase = createClient();
  const scope = await getUserScope(supabase);
  const peutGerer = scope.role !== "chef_site";

  const siteIdEffectif =
    searchParams.site_id ?? (scope.role === "superviseur" ? lireFiltreSiteSuperviseur()?.toString() : undefined);

  const [{ data: sites }, { data: classes }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  let query = supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, contact_parent, option_m, classes!inner(nom_classe, site_id, sites(nom_site))")
    .eq("statut", "actif")
    .order("nom");

  if (siteIdEffectif) query = query.eq("classes.site_id", siteIdEffectif);
  if (searchParams.classe_id) query = query.eq("classe_id", searchParams.classe_id);
  if (searchParams.college) query = query.ilike("college", `%${searchParams.college}%`);
  if (searchParams.nom) query = query.ilike("nom", `%${searchParams.nom}%`);

  const { data: eleves } = await query;

  const elevesFiltres = (eleves ?? []) as unknown as EleveRow[];

  const columns: DataTableColumn<EleveRow>[] = [
    { key: "matricule", label: "Matricule", render: (e) => <span className="font-mono text-xs">{e.matricule}</span> },
    { key: "nom", label: "Nom", render: (e) => <span className="font-medium">{e.nom}</span> },
    { key: "prenoms", label: "Prénoms", render: (e) => e.prenoms },
    { key: "classe", label: "Classe", render: (e) => e.classes?.nom_classe ?? "—" },
    { key: "site", label: "Site", render: (e) => e.classes?.sites?.nom_site ?? "—" },
    ...(peutGerer
      ? [{ key: "contact", label: "Contact parent", render: (e: EleveRow) => e.contact_parent }]
      : []),
    ...(peutGerer
      ? [
          {
            key: "actions",
            label: "Actions",
            render: (e: EleveRow) => (
              <div className="flex gap-2 flex-wrap">
                <Link href={`/admin/eleves/${e.id}/modifier`}>
                  <Button variant="outline" size="sm">
                    Modifier
                  </Button>
                </Link>
                <SuspendreDialog eleveId={e.id} nomComplet={`${e.nom} ${e.prenoms}`} />
                {scope.role === "coordonnateur" && (
                  <ReinitialiserMotDePasseParentDialog matricule={e.matricule} nomComplet={`${e.nom} ${e.prenoms}`} />
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Élèves"
        subtitle={`${elevesFiltres.length} élève(s) actif(s)`}
        actions={
          peutGerer ? (
            <Link href="/admin/eleves/inscription">
              <Button>
                <UserPlus className="w-4 h-4" />
                Inscrire un élève
              </Button>
            </Link>
          ) : undefined
        }
      />

      <ActionsBar>
        <Link href="/admin/eleves/suspendus">
          <Button variant="outline" size="sm">
            <UserXIcon className="w-3.5 h-3.5" />
            Élèves suspendus
          </Button>
        </Link>
      </ActionsBar>

      <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <select
          name="site_id"
          defaultValue={siteIdEffectif ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous les sites</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom_site}
            </option>
          ))}
        </select>
        <select
          name="classe_id"
          defaultValue={searchParams.classe_id ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Toutes les classes</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <input
          name="college"
          defaultValue={searchParams.college ?? ""}
          placeholder="Collège"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <input
          name="nom"
          defaultValue={searchParams.nom ?? ""}
          placeholder="Nom"
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <AutoSubmitOnChange />
      </form>

      <DataTable
        columns={columns}
        rows={elevesFiltres}
        rowKey={(e) => e.id}
        emptyState={
          <EmptyState icon={Users} title="Aucun élève" description="Aucun élève ne correspond aux filtres actuels." />
        }
      />
    </div>
  );
}
