import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn, type MobileCardConfig } from "@/components/admin/DataTable";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { ClotureSemestreButton } from "@/components/admin/notes/ClotureSemestreButton";
import { calculerMoyenneAnnuelle } from "@/lib/moyennes";

interface EleveRow {
  id: number;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
}

/**
 * Registre officiel des moyennes semestrielles/annuelle (sql/019) —
 * distinct de /admin/notes/moyennes (estimation en direct) : ici, les
 * valeurs affichées sont celles figées au dernier clic sur "Clôturer" pour
 * chaque semestre, pas recalculées à la volée. MA = (MS1 + MS2×2)/3.
 * Réservé au coordonnateur.
 */
export default async function SuiviMoyennesPage(
  props: {
    searchParams: Promise<{ site_id?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Suivi Moyennes" />
        <EmptyState icon={ClipboardList} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: sites }, { data: anneeEnCours }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("annees_scolaires").select("id").eq("statut", "en_cours").maybeSingle(),
  ]);

  const header = (
    <PageHeader
      title="Suivi Moyennes"
      subtitle="Registre officiel par semestre et moyenne annuelle (MA)"
      actions={
        anneeEnCours && (
          <>
            <ClotureSemestreButton semestre={1} />
            <ClotureSemestreButton semestre={2} />
          </>
        )
      }
    />
  );

  if (!anneeEnCours) {
    return (
      <div>
        {header}
        <EmptyState icon={ClipboardList} title="Aucune année scolaire en cours" description="Configurez une année scolaire en_cours." />
      </div>
    );
  }

  let query = supabase
    .from("eleves")
    .select("id, nom, prenoms, classes!inner(nom_classe, site_id, sites(nom_site))")
    .eq("statut", "actif")
    .order("nom");
  if (searchParams.site_id) query = query.eq("classes.site_id", searchParams.site_id);

  const [{ data: elevesData }, { data: moyennesData }] = await Promise.all([
    query,
    supabase
      .from("moyennes_semestrielles")
      .select("eleve_id, semestre, moyenne_generale")
      .eq("annee_scolaire_id", anneeEnCours.id),
  ]);

  const eleves = (elevesData ?? []) as unknown as EleveRow[];

  const moyennesParEleve = new Map<number, { 1?: number | null; 2?: number | null }>();
  for (const m of moyennesData ?? []) {
    const entry = moyennesParEleve.get(m.eleve_id) ?? {};
    entry[m.semestre as 1 | 2] = m.moyenne_generale !== null ? Number(m.moyenne_generale) : null;
    moyennesParEleve.set(m.eleve_id, entry);
  }

  const columns: DataTableColumn<EleveRow>[] = [
    {
      key: "eleve",
      label: "Élève",
      render: (e) => (
        <span className="font-medium">
          {e.nom} {e.prenoms}
        </span>
      ),
    },
    { key: "classe", label: "Classe", render: (e) => e.classes?.nom_classe ?? "—" },
    { key: "site", label: "Site", render: (e) => e.classes?.sites?.nom_site ?? "—" },
    {
      key: "ms1",
      label: "MS1",
      render: (e) => {
        const v = moyennesParEleve.get(e.id)?.[1];
        return v != null ? v.toFixed(2) : "—";
      },
    },
    {
      key: "ms2",
      label: "MS2",
      render: (e) => {
        const v = moyennesParEleve.get(e.id)?.[2];
        return v != null ? v.toFixed(2) : "—";
      },
    },
    {
      key: "ma",
      label: "Moyenne annuelle (MA)",
      render: (e) => {
        const entry = moyennesParEleve.get(e.id);
        const ma = calculerMoyenneAnnuelle(entry?.[1] ?? null, entry?.[2] ?? null);
        return <span className="font-bold text-primary">{ma !== null ? ma.toFixed(2) : "—"}</span>;
      },
    },
  ];

  const mobileCard: MobileCardConfig<EleveRow> = {
    title: (e) => <span>{e.nom} {e.prenoms}</span>,
    topRight: (e) => {
      const entry = moyennesParEleve.get(e.id);
      const ma = calculerMoyenneAnnuelle(entry?.[1] ?? null, entry?.[2] ?? null);
      return (
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Moy. Annuelle</span>
          <span className="font-bold text-primary text-sm sm:text-base">
            {ma !== null ? ma.toFixed(2) : "—"}
          </span>
        </div>
      );
    },
    subtitle: (e) => (
      <>
        <span className="font-medium text-gray-700">{e.classes?.nom_classe ?? "—"}</span>
        <span>•</span>
        <span>{e.classes?.sites?.nom_site ?? "—"}</span>
      </>
    ),
    extraInfo: (e) => {
      const v1 = moyennesParEleve.get(e.id)?.[1];
      const v2 = moyennesParEleve.get(e.id)?.[2];
      return (
        <span>
          Semestre 1 : <strong className="text-gray-700 font-medium">{v1 != null ? v1.toFixed(2) : "—"}</strong> • Semestre 2 : <strong className="text-gray-700 font-medium">{v2 != null ? v2.toFixed(2) : "—"}</strong>
        </span>
      );
    },
  };

  return (
    <div>
      {header}

      <form method="get" className="grid grid-cols-2 sm:grid-cols-2 gap-2 mb-3 max-w-xl">
        <select
          name="site_id"
          defaultValue={searchParams.site_id ?? ""}
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
        >
          <option value="">Tous les sites</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom_site}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      <DataTable
        columns={columns}
        rows={eleves}
        rowKey={(e) => e.id}
        mobileCard={mobileCard}
        emptyState={<EmptyState icon={ClipboardList} title="Aucun élève" description="Aucun élève actif à afficher." />}
      />
    </div>
  );
}
