import Link from "next/link";
import { Award, UserCheck, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface ExonerationRow {
  id: number;
  eleve_id: number;
  type_exoneration: "permanente" | "bourse";
  nombre_mois: number;
  mois_couverts: string[];
  motif: string;
  created_at: string;
  eleves: {
    matricule: string;
    nom: string;
    prenoms: string;
    classes: {
      id: number;
      nom_classe: string;
      site_id: number;
      sites: { nom_site: string } | null;
      frais_td: { montant: number }[] | null;
    } | null;
  } | null;
}

export default async function ExonerationsPage(props: {
  searchParams: Promise<{ site_id?: string; classe_id?: string; type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Exonérations et bourses" />
        <PaiementsNav active="exonerations" role={scope.role} />
        <EmptyState icon={Award} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: anneeEnCours }, { data: sites }, { data: classes }] = await Promise.all([
    supabase.from("annees_scolaires").select("id, libelle").eq("statut", "en_cours").single(),
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  if (!anneeEnCours) {
    return (
      <div>
        <PageHeader title="Exonérations et bourses" />
        <PaiementsNav active="exonerations" role={scope.role} />
        <EmptyState icon={Award} title="Aucune année en cours" description="Veuillez activer une année scolaire." />
      </div>
    );
  }

  let query = supabase
    .from("eleves_exonerations")
    .select(
      "id, eleve_id, type_exoneration, nombre_mois, mois_couverts, motif, created_at, eleves!inner(matricule, nom, prenoms, classes!inner(id, nom_classe, site_id, sites(nom_site), frais_td(montant)))"
    )
    .eq("annee_scolaire_id", anneeEnCours.id)
    .order("created_at", { ascending: false });

  if (scope.role === "superviseur" && scope.siteIds && scope.siteIds.length > 0) {
    query = query.in("eleves.classes.site_id", scope.siteIds);
  }

  const siteIdEffectif =
    searchParams.site_id !== undefined
      ? searchParams.site_id || undefined
      : scope.role === "superviseur"
        ? (await lireFiltreSiteSuperviseur())?.toString()
        : undefined;

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const classeIdValide =
    searchParams.classe_id && classesFiltrees.some((c) => String(c.id) === searchParams.classe_id)
      ? searchParams.classe_id
      : undefined;

  if (siteIdEffectif) {
    query = query.eq("eleves.classes.site_id", Number(siteIdEffectif));
  }

  if (classeIdValide) {
    query = query.eq("eleves.classes.id", Number(classeIdValide));
  }

  if (searchParams.type) {
    query = query.eq("type_exoneration", searchParams.type);
  }

  const { data: rawRows } = await query;
  const rows = (rawRows ?? []) as unknown as ExonerationRow[];

  // Calculs statistiques
  const totalBeneficiaires = rows.length;
  const totalPermanentes = rows.filter((r) => r.type_exoneration === "permanente").length;
  const totalBourses = rows.filter((r) => r.type_exoneration === "bourse").length;
  const totalMoisExoneres = rows.reduce((sum, r) => sum + r.nombre_mois, 0);

  const colonnes: DataTableColumn<ExonerationRow>[] = [
    {
      key: "matricule",
      label: "Matricule",
      render: (r) => (
        <span className="font-mono text-xs text-gray-500 font-semibold">{r.eleves?.matricule}</span>
      ),
    },
    {
      key: "nom",
      label: "Élève",
      render: (r) => (
        <span className="font-medium text-gray-800">
          {r.eleves?.nom} {r.eleves?.prenoms}
        </span>
      ),
    },
    {
      key: "classe",
      label: "Classe / Site",
      render: (r) => (
        <span className="text-gray-600 text-xs">
          {r.eleves?.classes?.nom_classe} — {r.eleves?.classes?.sites?.nom_site}
        </span>
      ),
    },
    {
      key: "type",
      label: "Régime",
      render: (r) => (
        <Badge variant={r.type_exoneration === "permanente" ? "neutral" : "warning"}>
          {r.type_exoneration === "permanente" ? "Permanente (8 mois)" : `Bourse (${r.nombre_mois} mois)`}
        </Badge>
      ),
    },
    {
      key: "mois",
      label: "Mois couverts",
      render: (r) => (
        <span className="text-xs text-gray-700">
          {r.type_exoneration === "permanente" ? "Année entière (Oct-Mai)" : (r.mois_couverts ?? []).join(", ")}
        </span>
      ),
    },
    {
      key: "motif",
      label: "Motif / Justification",
      render: (r) => <span className="text-xs text-gray-600 italic">{r.motif}</span>,
    },
    {
      key: "date",
      label: "Date",
      render: (r) => new Date(r.created_at).toLocaleDateString("fr-FR"),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Link href={`/admin/eleves/${r.eleve_id}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
            <Eye className="w-3 h-3" />
            <span>Fiche</span>
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exonérations et bourses scolaires"
        subtitle={`Année scolaire ${anneeEnCours.libelle} — Suivi des dispenses et régimes d'exception`}
      />

      <PaiementsNav active="exonerations" role={scope.role} />

      {/* Cartes récapitulatives */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Élèves bénéficiaires</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalBeneficiaires}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Bourses à durée variable</div>
          <div className="text-2xl font-bold text-primary mt-1">{totalBourses}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Exonérations permanentes</div>
          <div className="text-2xl font-bold text-purple-700 mt-1">{totalPermanentes}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100">
          <div className="text-xs text-gray-500 font-medium">Total mois dispensés</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{totalMoisExoneres}</div>
        </div>
      </div>

      {/* Filtres */}
      <form method="get" className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap gap-3 items-end">
        <AutoSubmitOnChange />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
          <select
            name="site_id"
            defaultValue={siteIdEffectif ?? ""}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700"
          >
            <option value="">Tous les sites</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom_site}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
          <select
            name="classe_id"
            defaultValue={classeIdValide ?? ""}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700"
          >
            <option value="">Toutes les classes</option>
            {classesFiltrees.map((c) => (
              <option key={c.id} value={c.id}>
                {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de dispense</label>
          <select
            name="type"
            defaultValue={searchParams.type ?? ""}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700"
          >
            <option value="">Tous les types</option>
            <option value="bourse">Bourse scolaire</option>
            <option value="permanente">Exonération permanente</option>
          </select>
        </div>
      </form>

      {/* Tableau des bénéficiaires */}
      {rows.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Aucun élève exonéré ou boursier"
          description="Aucune dispense enregistrée avec les filtres sélectionnés."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <DataTable columns={colonnes} rows={rows} rowKey={(r) => r.id} />
        </div>
      )}
    </div>
  );
}
