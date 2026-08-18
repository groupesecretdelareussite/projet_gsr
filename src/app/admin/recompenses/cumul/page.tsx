import { Trophy, Medal, Users, DollarSign, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { RecompensesNav } from "@/components/admin/recompenses/RecompensesNav";
import { ExporterExcelButton } from "@/components/admin/ExporterExcelButton";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface RecompenseCumulDB {
  id: number;
  eleve_id: number;
  type_gain: string;
  montant: number;
  date_paiement: string;
  eleves: {
    id: number;
    matricule: string;
    nom: string;
    prenoms: string;
    classe_id: number;
    classes: { id: number; nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
  } | null;
}

interface EleveCumulRow {
  rang: number;
  eleveId: number;
  matricule: string;
  nom: string;
  prenoms: string;
  nomClasse: string;
  nomSite: string;
  siteId: number;
  classeId: number;
  totalDevoirs: number;
  nbDevoirs: number;
  totalInterros: number;
  nbInterros: number;
  totalGagne: number;
  nbRecompenses: number;
  dernierPaiement: string;
}

export default async function RecompensesCumulPage(
  props: {
    searchParams: Promise<{ annee_id?: string; site_id?: string; classe_id?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Palmarès des récompenses" />
        <EmptyState icon={Trophy} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: annees }, { data: sites }, { data: classes }] = await Promise.all([
    supabase.from("annees_scolaires").select("id, libelle, statut").order("date_debut", { ascending: false }),
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  const anneesList = annees ?? [];
  const anneeSelectionnee =
    (searchParams.annee_id ? anneesList.find((a) => a.id === Number(searchParams.annee_id)) : undefined) ??
    anneesList.find((a) => a.statut === "en_cours") ??
    anneesList[0];

  const siteIdEffectif =
    searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  let cumulEleves: EleveCumulRow[] = [];

  if (anneeSelectionnee) {
    const { data: recompensesData } = await supabase
      .from("recompenses")
      .select(
        "id, eleve_id, type_gain, montant, date_paiement, eleves!inner(id, matricule, nom, prenoms, classe_id, classes!inner(id, nom_classe, site_id, sites(nom_site)))"
      )
      .eq("annee_scolaire_id", anneeSelectionnee.id)
      .order("date_paiement", { ascending: false });

    const rows = (recompensesData ?? []) as unknown as RecompenseCumulDB[];

    const mapEleves = new Map<
      number,
      {
        info: RecompenseCumulDB["eleves"];
        totalDevoirs: number;
        nbDevoirs: number;
        totalInterros: number;
        nbInterros: number;
        totalGagne: number;
        dernierPaiement: string;
      }
    >();

    for (const r of rows) {
      if (!r.eleves) continue;

      const existant = mapEleves.get(r.eleve_id) ?? {
        info: r.eleves,
        totalDevoirs: 0,
        nbDevoirs: 0,
        totalInterros: 0,
        nbInterros: 0,
        totalGagne: 0,
        dernierPaiement: r.date_paiement,
      };

      if (r.type_gain === "devoir") {
        existant.totalDevoirs += r.montant;
        existant.nbDevoirs += 1;
      } else if (r.type_gain === "interro") {
        existant.totalInterros += r.montant;
        existant.nbInterros += 1;
      }
      existant.totalGagne += r.montant;

      if (!existant.dernierPaiement || new Date(r.date_paiement) > new Date(existant.dernierPaiement)) {
        existant.dernierPaiement = r.date_paiement;
      }

      mapEleves.set(r.eleve_id, existant);
    }

    const listeAggregee: Omit<EleveCumulRow, "rang">[] = [];

    for (const [eleveId, val] of mapEleves.entries()) {
      if (!val.info?.classes) continue;

      listeAggregee.push({
        eleveId,
        matricule: val.info.matricule,
        nom: val.info.nom,
        prenoms: val.info.prenoms,
        nomClasse: val.info.classes.nom_classe,
        nomSite: val.info.classes.sites?.nom_site ?? "—",
        siteId: val.info.classes.site_id,
        classeId: val.info.classes.id,
        totalDevoirs: val.totalDevoirs,
        nbDevoirs: val.nbDevoirs,
        totalInterros: val.totalInterros,
        nbInterros: val.nbInterros,
        totalGagne: val.totalGagne,
        nbRecompenses: val.nbDevoirs + val.nbInterros,
        dernierPaiement: val.dernierPaiement,
      });
    }

    // Tri par montant total décroissant
    listeAggregee.sort((a, b) => b.totalGagne - a.totalGagne || a.nom.localeCompare(b.nom));

    // Attribution des rangs
    cumulEleves = listeAggregee.map((e, index) => ({
      ...e,
      rang: index + 1,
    }));
  }

  // Filtrage
  if (siteIdEffectif) {
    cumulEleves = cumulEleves.filter((e) => String(e.siteId) === siteIdEffectif);
  }
  if (searchParams.classe_id) {
    cumulEleves = cumulEleves.filter((e) => String(e.classeId) === searchParams.classe_id);
  }

  // Re-calcul des rangs après filtre éventuel
  cumulEleves = cumulEleves.map((e, idx) => ({ ...e, rang: idx + 1 }));

  // KPIs
  const totalEleves = cumulEleves.length;
  const montantGlobal = cumulEleves.reduce((s, e) => s + e.totalGagne, 0);
  const moyenneParEleve = totalEleves > 0 ? Math.round(montantGlobal / totalEleves) : 0;
  const maxGagne = totalEleves > 0 ? Math.max(...cumulEleves.map((e) => e.totalGagne)) : 0;

  const peutExporter = ["coordonnateur", "comptable", "superviseur"].includes(scope.role);
  const nomSiteTitre = siteIdEffectif ? nomSiteParId.get(Number(siteIdEffectif)) ?? "Site inconnu" : "Tous les sites";
  const dateExport = new Date().toLocaleDateString("fr-FR");

  const lignesExport = cumulEleves.map((e) => ({
    Rang: e.rang,
    Élève: `${e.nom} ${e.prenoms}`,
    Matricule: e.matricule,
    Classe: e.nomClasse,
    Site: e.nomSite,
    "Devoirs (F)": e.totalDevoirs,
    "Interros (F)": e.totalInterros,
    "Total Gagné (F)": e.totalGagne,
    "Nb Récompenses": e.nbRecompenses,
    "Dernier Paiement": e.dernierPaiement ? new Date(e.dernierPaiement).toLocaleDateString("fr-FR") : "—",
  }));

  const columns: DataTableColumn<EleveCumulRow>[] = [
    {
      key: "rang",
      label: "Rang",
      render: (e) => (
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
            e.rang === 1
              ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
              : e.rang === 2
              ? "bg-gray-100 text-gray-700 ring-2 ring-gray-300"
              : e.rang === 3
              ? "bg-orange-100 text-orange-800 ring-2 ring-orange-300"
              : "text-gray-500 font-medium"
          }`}
        >
          {e.rang}
        </span>
      ),
    },
    {
      key: "eleve",
      label: "Élève",
      render: (e) => (
        <span>
          <span className="font-semibold text-gray-900">{e.nom} {e.prenoms}</span>{" "}
          <span className="text-gray-400 font-mono text-xs block sm:inline">{e.matricule}</span>
        </span>
      ),
    },
    {
      key: "classe",
      label: "Classe & Site",
      render: (e) => (
        <span className="text-sm">
          <span className="font-medium text-gray-800">{e.nomClasse}</span>
          <span className="text-gray-400 text-xs block">{e.nomSite}</span>
        </span>
      ),
    },
    {
      key: "devoirs",
      label: "Devoirs (500F)",
      render: (e) => (
        <span className="text-sm text-gray-700">
          <span className="font-semibold">{e.totalDevoirs.toLocaleString("fr-FR")} F</span>{" "}
          <span className="text-gray-400 text-xs">({e.nbDevoirs})</span>
        </span>
      ),
    },
    {
      key: "interros",
      label: "Interros (200F)",
      render: (e) => (
        <span className="text-sm text-gray-700">
          <span className="font-semibold">{e.totalInterros.toLocaleString("fr-FR")} F</span>{" "}
          <span className="text-gray-400 text-xs">({e.nbInterros})</span>
        </span>
      ),
    },
    {
      key: "total",
      label: "Total cumulé",
      render: (e) => (
        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
          <Award className="w-3.5 h-3.5" />
          {e.totalGagne.toLocaleString("fr-FR")} F
        </span>
      ),
    },
    {
      key: "dernier",
      label: "Dernier versement",
      render: (e) => (
        <span className="text-xs text-gray-500">
          {e.dernierPaiement ? new Date(e.dernierPaiement).toLocaleDateString("fr-FR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Palmarès & Cumul des récompenses"
        subtitle={`Cumul annuel de tous les élèves récompensés (${anneeSelectionnee?.libelle ?? ""})`}
        actions={
          peutExporter && cumulEleves.length > 0 ? (
            <ExporterExcelButton
              label="Exporter le palmarès"
              titre={`Palmarès Récompenses — ${nomSiteTitre} — ${anneeSelectionnee?.libelle ?? ""} — ${dateExport}`}
              lignes={lignesExport}
              nomFichier={`Palmares_Recompenses_${nomSiteTitre}_${anneeSelectionnee?.libelle ?? ""}`.replace(/\s+/g, "_")}
              nomFeuille="Palmarès"
            />
          ) : undefined
        }
      />
      <RecompensesNav active="cumul" />

      {/* Formulaire de filtres responsive */}
      <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
        <select
          name="annee_id"
          defaultValue={anneeSelectionnee?.id ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          {anneesList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </select>

        <select
          name="site_id"
          defaultValue={siteIdEffectif ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
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
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Toutes les classes</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>

        <AutoSubmitOnChange />
      </form>

      {!anneeSelectionnee ? (
        <EmptyState icon={Trophy} title="Aucune année scolaire" description="Configurez une année scolaire pour voir le palmarès." />
      ) : (
        <>
          {/* Cartes KPI responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={Users} label="Élèves récompensés" value={totalEleves} />
            <KpiCard icon={Trophy} label="Total versé sur l'année" value={`${montantGlobal.toLocaleString("fr-FR")} F`} />
            <KpiCard icon={DollarSign} label="Moyenne par élève" value={`${moyenneParEleve.toLocaleString("fr-FR")} F`} />
            <KpiCard icon={Medal} label="Meilleur gain individuel" value={`${maxGagne.toLocaleString("fr-FR")} F`} />
          </div>

          <DataTable
            columns={columns}
            rows={cumulEleves}
            rowKey={(e) => e.eleveId}
            emptyState={
              <EmptyState
                icon={Trophy}
                title="Aucune récompense versée"
                description="Aucun paiement de récompense n'a encore été enregistré pour cette année scolaire."
              />
            }
          />
        </>
      )}
    </div>
  );
}
