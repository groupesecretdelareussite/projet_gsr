import { ClipboardList, Users, UserCheck, UserX, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { KpiCard } from "@/components/admin/KpiCard";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { PresencesNav } from "@/components/admin/presences/PresencesNav";
import { HistoriqueModeTabs } from "@/components/admin/presences/HistoriqueModeTabs";
import { ExporterExcelButton } from "@/components/admin/ExporterExcelButton";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface EleveStatut {
  id: number;
  nom: string;
  prenoms: string;
  present: boolean;
}

export default async function HistoriqueClassePage(
  props: { searchParams: Promise<{ site_id?: string; classe_id?: string; date?: string }> }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Historique des présences" />
        <EmptyState icon={ClipboardList} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: sites }, { data: classes }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  const siteIdEffectif = estChefSiteOuSecretaire
    ? scope.siteId?.toString()
    : searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const classeId = searchParams.classe_id ? Number(searchParams.classe_id) : undefined;
  const classeSelectionnee = (classes ?? []).find((c) => c.id === classeId);
  const date = searchParams.date;

  let eleves: EleveStatut[] = [];

  if (classeId && date) {
    const [{ data: elevesData }, { data: presencesData }] = await Promise.all([
      supabase.from("eleves").select("id, nom, prenoms").eq("classe_id", classeId).eq("statut", "actif").order("nom"),
      supabase.from("presences").select("eleve_id, present").eq("classe_id", classeId).eq("date_presence", date),
    ]);
    const presenceParEleve = new Map((presencesData ?? []).map((p) => [p.eleve_id, p.present]));
    eleves = (elevesData ?? []).map((e) => ({ ...e, present: presenceParEleve.get(e.id) ?? false }));
  }

  const total = eleves.length;
  const presents = eleves.filter((e) => e.present).length;
  const absents = total - presents;
  const taux = total > 0 ? Math.round((presents / total) * 100) : 0;

  const columns: DataTableColumn<EleveStatut>[] = [
    { key: "nom", label: "Nom", render: (e) => e.nom },
    { key: "prenoms", label: "Prénoms", render: (e) => e.prenoms },
    {
      key: "statut",
      label: "Statut",
      render: (e) => <Badge variant={e.present ? "success" : "danger"}>{e.present ? "Présent" : "Absent"}</Badge>,
    },
  ];

  const nomSiteTitre = classeSelectionnee ? nomSiteParId.get(classeSelectionnee.site_id) ?? "" : "";
  const lignesExportPresents = eleves.filter((e) => e.present).map((e) => ({ Nom: e.nom, Prénoms: e.prenoms }));
  const lignesExportAbsents = eleves.filter((e) => !e.present).map((e) => ({ Nom: e.nom, Prénoms: e.prenoms }));

  return (
    <div>
      <PageHeader title="Historique des présences" subtitle="Par classe et par date" />
      <PresencesNav active="historique" />
      <HistoriqueModeTabs active="classe" />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
        {!estChefSiteOuSecretaire && (
          <select name="site_id" defaultValue={siteIdEffectif ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Tous les sites</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom_site}
              </option>
            ))}
          </select>
        )}
        <select name="classe_id" defaultValue={searchParams.classe_id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Choisir une classe</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <input type="date" name="date" defaultValue={date ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
        <AutoSubmitOnChange />
      </form>

      {!classeId || !date ? (
        <EmptyState icon={ClipboardList} title="Choisissez une classe et une date" description="Sélectionnez une classe et une date ci-dessus." />
      ) : eleves.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun élève actif" description="Cette classe n'a aucun élève actif, ou aucune présence n'a été enregistrée pour cette date." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={Users} label="Total élèves" value={total} />
            <KpiCard icon={UserCheck} label="Présents" value={presents} />
            <KpiCard icon={UserX} label="Absents" value={absents} />
            <KpiCard icon={Percent} label="Taux de présence" value={`${taux}%`} />
          </div>

          <div className="flex justify-end gap-2 mb-4">
            <ExporterExcelButton
              label="Présents"
              titre={`Présents — ${classeSelectionnee?.nom_classe} — ${nomSiteTitre} — ${date}`}
              lignes={lignesExportPresents}
              nomFichier={`Presents_${classeSelectionnee?.nom_classe}_${date}`.replace(/\s+/g, "_")}
              nomFeuille="Présents"
            />
            <ExporterExcelButton
              label="Absents"
              titre={`Absents — ${classeSelectionnee?.nom_classe} — ${nomSiteTitre} — ${date}`}
              lignes={lignesExportAbsents}
              nomFichier={`Absents_${classeSelectionnee?.nom_classe}_${date}`.replace(/\s+/g, "_")}
              nomFeuille="Absents"
            />
          </div>

          <DataTable columns={columns} rows={eleves} rowKey={(e) => e.id} />
        </>
      )}
    </div>
  );
}
