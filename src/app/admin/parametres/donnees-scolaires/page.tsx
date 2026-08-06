import { School, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { NouveauSiteDialog } from "@/components/admin/parametres/NouveauSiteDialog";
import { ModifierSiteDialog } from "@/components/admin/parametres/ModifierSiteDialog";
import { SupprimerSiteDialog } from "@/components/admin/parametres/SupprimerSiteDialog";
import { SiteSelector } from "@/components/admin/parametres/SiteSelector";
import { NouvelleClasseDialog, type ClasseOption } from "@/components/admin/parametres/NouvelleClasseDialog";
import { ModifierClasseDialog } from "@/components/admin/parametres/ModifierClasseDialog";
import { SupprimerClasseDialog } from "@/components/admin/parametres/SupprimerClasseDialog";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";

interface SiteRow {
  id: number;
  nom_site: string;
  initiale: string;
}

interface ClasseRow {
  id: number;
  nom_classe: string;
  site_id: number;
  ordre: number;
  classe_suivante_id: number | null;
}

/** Vrai si la date du jour tombe dans l'intervalle de l'année scolaire en_cours — reflète trg_frais_td_lock_period (§12.11). */
function dansPeriodeEnCours(dateDebut: string, dateFin: string): boolean {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  return aujourdhui >= dateDebut && aujourdhui <= dateFin;
}

export default async function DonneesScolairesPage(
  props: {
    searchParams: Promise<{ site?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const scope = await getUserScope(await createClient());

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Données scolaires" />
        <EmptyState icon={School} title="Non autorisé" description="Cette page est réservée au coordonnateur." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  const [{ data: sites }, { data: classes }, { data: fraisTd }, { data: eleves }, { data: anneeEnCours }] =
    await Promise.all([
      supabaseAdmin.from("sites").select("id, nom_site, initiale").order("nom_site"),
      supabaseAdmin.from("classes").select("id, nom_classe, site_id, ordre, classe_suivante_id"),
      supabaseAdmin.from("frais_td").select("classe_id, montant"),
      supabaseAdmin.from("eleves").select("id, classe_id"),
      supabaseAdmin.from("annees_scolaires").select("date_debut, date_fin").eq("statut", "en_cours").maybeSingle(),
    ]);

  const sitesList = (sites ?? []) as SiteRow[];
  const classesList = (classes ?? []) as ClasseRow[];
  const nomSiteParId = new Map(sitesList.map((s) => [s.id, s.nom_site]));
  const fraisParClasse = new Map((fraisTd ?? []).map((f) => [f.classe_id as number, Number(f.montant)]));
  const nomClasseParId = new Map(classesList.map((c) => [c.id, c.nom_classe]));

  const nbClassesParSite = new Map<number, number>();
  const nbElevesParSite = new Map<number, number>();
  const nbElevesParClasse = new Map<number, number>();
  const siteIdParClasseId = new Map(classesList.map((c) => [c.id, c.site_id]));

  for (const c of classesList) {
    nbClassesParSite.set(c.site_id, (nbClassesParSite.get(c.site_id) ?? 0) + 1);
  }
  for (const e of eleves ?? []) {
    nbElevesParClasse.set(e.classe_id, (nbElevesParClasse.get(e.classe_id) ?? 0) + 1);
    const siteId = siteIdParClasseId.get(e.classe_id);
    if (siteId) nbElevesParSite.set(siteId, (nbElevesParSite.get(siteId) ?? 0) + 1);
  }

  const tarifVerrouille = !!anneeEnCours && dansPeriodeEnCours(anneeEnCours.date_debut, anneeEnCours.date_fin);

  const toutesLesClassesOptions: ClasseOption[] = classesList.map((c) => ({
    id: c.id,
    nom_classe: c.nom_classe,
    nom_site: nomSiteParId.get(c.site_id) ?? "?",
  }));

  const siteSelectionneId = searchParams.site ? Number(searchParams.site) : sitesList[0]?.id;
  const classesDuSite = classesList
    .filter((c) => c.site_id === siteSelectionneId)
    .sort((a, b) => a.ordre - b.ordre);
  const prochainOrdre = classesDuSite.length > 0 ? Math.max(...classesDuSite.map((c) => c.ordre)) + 1 : 1;

  const siteColumns: DataTableColumn<SiteRow>[] = [
    { key: "nom_site", label: "Site", render: (s) => <span className="font-medium">{s.nom_site}</span> },
    { key: "initiale", label: "Initiale", render: (s) => s.initiale },
    { key: "classes", label: "Classes", render: (s) => nbClassesParSite.get(s.id) ?? 0 },
    { key: "eleves", label: "Élèves actifs", render: (s) => nbElevesParSite.get(s.id) ?? 0 },
    {
      key: "actions",
      label: "Actions",
      render: (s) => (
        <div className={`flex flex-wrap gap-2 ${ACTIONS_HOVER_REVEAL}`}>
          <ModifierSiteDialog siteId={s.id} initialNomSite={s.nom_site} initialInitiale={s.initiale} />
          <SupprimerSiteDialog siteId={s.id} nomSite={s.nom_site} />
        </div>
      ),
    },
  ];

  const classeColumns: DataTableColumn<ClasseRow>[] = [
    { key: "nom_classe", label: "Classe", render: (c) => <span className="font-medium">{c.nom_classe}</span> },
    { key: "ordre", label: "Ordre", render: (c) => c.ordre },
    {
      key: "classe_suivante",
      label: "Classe suivante",
      render: (c) =>
        c.classe_suivante_id ? nomClasseParId.get(c.classe_suivante_id) ?? "—" : "À traiter manuellement",
    },
    {
      key: "tarif",
      label: "Tarif TD",
      render: (c) => `${(fraisParClasse.get(c.id) ?? 0).toLocaleString("fr-FR")} F`,
    },
    { key: "eleves", label: "Élèves", render: (c) => nbElevesParClasse.get(c.id) ?? 0 },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <div className={`flex flex-wrap gap-2 ${ACTIONS_HOVER_REVEAL}`}>
          <ModifierClasseDialog
            classeId={c.id}
            initialNomClasse={c.nom_classe}
            initialOrdre={c.ordre}
            initialClasseSuivanteId={c.classe_suivante_id}
            initialTarifTd={fraisParClasse.get(c.id) ?? 0}
            tarifVerrouille={tarifVerrouille}
            classesDisponibles={toutesLesClassesOptions.filter((opt) => opt.id !== c.id)}
          />
          <SupprimerClasseDialog classeId={c.id} nomClasse={c.nom_classe} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Données scolaires"
        subtitle="Sites, classes et tarifs TD"
        actions={<NouveauSiteDialog />}
      />

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sites</h2>
        <DataTable
          columns={siteColumns}
          rows={sitesList}
          rowKey={(s) => s.id}
          emptyState={<EmptyState icon={School} title="Aucun site" description="Créez le premier site." />}
        />
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Classes</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <SiteSelector sites={sitesList} selectedSiteId={siteSelectionneId} />
            {siteSelectionneId && (
              <NouvelleClasseDialog
                siteId={siteSelectionneId}
                ordreSuggere={prochainOrdre}
                classesDisponibles={toutesLesClassesOptions}
              />
            )}
          </div>
        </div>
        {sitesList.length === 0 ? (
          <EmptyState icon={Layers} title="Aucun site" description="Créez d'abord un site pour lui ajouter des classes." />
        ) : (
          <DataTable
            columns={classeColumns}
            rows={classesDuSite}
            rowKey={(c) => c.id}
            emptyState={<EmptyState icon={Layers} title="Aucune classe" description="Créez la première classe de ce site." />}
          />
        )}
      </section>
    </div>
  );
}
