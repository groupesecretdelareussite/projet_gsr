import { Calculator, Wallet, TrendingDown, TrendingUp, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { NouvelleDepenseDialog } from "@/components/admin/comptabilite/NouvelleDepenseDialog";
import { ModifierDepenseDialog } from "@/components/admin/comptabilite/ModifierDepenseDialog";
import { SupprimerDepenseButton } from "@/components/admin/comptabilite/SupprimerDepenseButton";
import { EntreesSortiesChart } from "@/components/admin/comptabilite/EntreesSortiesChart";
import { moisCourant } from "@/lib/paiements";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

interface DepenseRow {
  id: number;
  categorie_id: number;
  libelle: string;
  montant: number;
  date_depense: string;
  categories_depenses: { nom: string } | null;
}

/** §11 GSR_ARCHITECTURE.md — Comptabilité globale, accès coordonnateur + comptable uniquement. */
export default async function ComptabilitePage(
  props: {
    searchParams: Promise<{ annee_id?: string; mois?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const scope = await getUserScope(await createClient());

  if (!["coordonnateur", "comptable"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Comptabilité" />
        <EmptyState icon={Calculator} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();

  const [{ data: annees }, { data: categories }] = await Promise.all([
    supabaseAdmin.from("annees_scolaires").select("id, libelle, statut, date_debut, date_fin").order("date_debut", { ascending: false }),
    supabaseAdmin.from("categories_depenses").select("id, nom").order("nom"),
  ]);

  const anneesList = annees ?? [];
  const anneeSelectionnee =
    (searchParams.annee_id ? anneesList.find((a) => a.id === Number(searchParams.annee_id)) : undefined) ??
    anneesList.find((a) => a.statut === "en_cours") ??
    anneesList[0];

  if (!anneeSelectionnee) {
    return (
      <div>
        <PageHeader title="Comptabilité" subtitle="Vue consolidée entrées / sorties" />
        <EmptyState icon={Calculator} title="Aucune année scolaire" description="Configurez une année scolaire pour voir la comptabilité." />
      </div>
    );
  }

  const [{ data: paiements }, { data: creneaux }, { data: postulations }, { data: depenses }] = await Promise.all([
    supabaseAdmin.from("paiements").select("montant_paye, mois_souscription").eq("annee_scolaire_id", anneeSelectionnee.id),
    // §8 CLAUDE.md prohibition #8 — pas de JOIN cross-schéma : td.creneaux/td.postulations sont dans le même schéma td,
    // combinés séparément en TypeScript avec public.annees_scolaires ci-dessous.
    supabaseAdmin
      .schema("td")
      .from("creneaux")
      .select("id, date_td, montant_prevu")
      .eq("statut_creneau", "cloture")
      .gte("date_td", anneeSelectionnee.date_debut)
      .lte("date_td", anneeSelectionnee.date_fin),
    supabaseAdmin.schema("td").from("postulations").select("creneau_id").eq("statut_validation", "Valide"),
    supabaseAdmin
      .from("depenses_annexes")
      .select("id, categorie_id, libelle, montant, date_depense, categories_depenses(nom)")
      .eq("annee_scolaire_id", anneeSelectionnee.id)
      .order("date_depense", { ascending: false }),
  ]);

  const creneauxPourvusIds = new Set((postulations ?? []).map((p) => p.creneau_id));
  const creneauxRemuneres = (creneaux ?? []).filter((c) => creneauxPourvusIds.has(c.id));
  const depensesRows = (depenses ?? []) as unknown as DepenseRow[];

  const moisFiltre = (searchParams.mois as MoisScolaire | undefined) ?? undefined;

  // --- KPI / synthèse — respectent le filtre "mois" s'il est présent ---
  const paiementsKpi = moisFiltre ? (paiements ?? []).filter((p) => p.mois_souscription === moisFiltre) : paiements ?? [];
  const creneauxKpi = moisFiltre ? creneauxRemuneres.filter((c) => moisCourant(new Date(c.date_td)) === moisFiltre) : creneauxRemuneres;
  const depensesKpi = moisFiltre ? depensesRows.filter((d) => moisCourant(new Date(d.date_depense)) === moisFiltre) : depensesRows;

  const totalEntrees = paiementsKpi.reduce((s, p) => s + p.montant_paye, 0);
  const totalRemunerations = creneauxKpi.reduce((s, c) => s + Number(c.montant_prevu), 0);
  const totalDepensesAnnexes = depensesKpi.reduce((s, d) => s + Number(d.montant), 0);
  const totalSorties = totalRemunerations + totalDepensesAnnexes;
  const resultatNet = totalEntrees - totalSorties;

  // --- Graphique mensuel — toujours les 8 mois, indépendant du filtre "mois" ---
  const entreesParMois = new Map<MoisScolaire, number>();
  for (const p of paiements ?? []) {
    entreesParMois.set(p.mois_souscription, (entreesParMois.get(p.mois_souscription) ?? 0) + p.montant_paye);
  }
  const sortiesParMois = new Map<MoisScolaire, number>();
  for (const c of creneauxRemuneres) {
    const m = moisCourant(new Date(c.date_td));
    if (m) sortiesParMois.set(m, (sortiesParMois.get(m) ?? 0) + Number(c.montant_prevu));
  }
  for (const d of depensesRows) {
    const m = moisCourant(new Date(d.date_depense));
    if (m) sortiesParMois.set(m, (sortiesParMois.get(m) ?? 0) + Number(d.montant));
  }
  const donneesMensuelles = MOIS_SCOLAIRES.map((m) => ({
    mois: m,
    entrees: entreesParMois.get(m) ?? 0,
    sorties: sortiesParMois.get(m) ?? 0,
  }));

  const columns: DataTableColumn<DepenseRow>[] = [
    { key: "date", label: "Date", render: (d) => new Date(d.date_depense).toLocaleDateString("fr-FR") },
    { key: "categorie", label: "Catégorie", render: (d) => d.categories_depenses?.nom ?? "—" },
    { key: "libelle", label: "Libellé", render: (d) => d.libelle },
    { key: "montant", label: "Montant", render: (d) => `${Number(d.montant).toLocaleString("fr-FR")} F` },
    {
      key: "actions",
      label: "Actions",
      render: (d) => (
        <div className="flex flex-wrap gap-2">
          <ModifierDepenseDialog
            depenseId={d.id}
            initialCategorieId={d.categorie_id}
            initialLibelle={d.libelle}
            initialMontant={Number(d.montant)}
            initialDateDepense={d.date_depense}
            categoriesInitiales={categories ?? []}
          />
          <SupprimerDepenseButton depenseId={d.id} libelle={d.libelle} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Comptabilité"
        subtitle="Vue consolidée entrées (paiements élèves) / sorties (rémunérations professeurs + dépenses annexes)"
        actions={<NouvelleDepenseDialog categoriesInitiales={categories ?? []} anneeScolaireId={anneeSelectionnee.id} />}
      />

      <form method="get" className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-w-xl">
        <select name="annee_id" defaultValue={anneeSelectionnee.id} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          {anneesList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </select>
        <select name="mois" defaultValue={searchParams.mois ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Tous les mois</option>
          {MOIS_SCOLAIRES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Wallet} label="Entrées" value={`${totalEntrees.toLocaleString("fr-FR")} F`} />
        <KpiCard icon={TrendingDown} label="Sorties (total)" value={`${totalSorties.toLocaleString("fr-FR")} F`} />
        <KpiCard icon={Receipt} label="Dont dépenses annexes" value={`${totalDepensesAnnexes.toLocaleString("fr-FR")} F`} />
        <KpiCard icon={TrendingUp} label="Résultat net" value={`${resultatNet.toLocaleString("fr-FR")} F`} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 max-w-md">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Synthèse</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Entrées</span>
            <span className="font-semibold text-gray-900">{totalEntrees.toLocaleString("fr-FR")} F</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-gray-400">Rémunérations professeurs</span>
            <span className="text-gray-600">{totalRemunerations.toLocaleString("fr-FR")} F</span>
          </div>
          <div className="flex justify-between pl-4">
            <span className="text-gray-400">Dépenses annexes</span>
            <span className="text-gray-600">{totalDepensesAnnexes.toLocaleString("fr-FR")} F</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total sorties</span>
            <span className="font-semibold text-gray-900">{totalSorties.toLocaleString("fr-FR")} F</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
            <span className="font-bold text-gray-900">Résultat net</span>
            <span className={`font-bold ${resultatNet >= 0 ? "text-primary" : "text-red-600"}`}>
              {resultatNet.toLocaleString("fr-FR")} F
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <EntreesSortiesChart data={donneesMensuelles} />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Dépenses annexes</h2>
      <DataTable
        columns={columns}
        rows={depensesKpi}
        rowKey={(d) => d.id}
        emptyState={<EmptyState icon={Receipt} title="Aucune dépense" description="Ajoutez la première dépense annexe." />}
      />
    </div>
  );
}
