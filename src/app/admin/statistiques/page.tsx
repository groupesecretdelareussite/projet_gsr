import { BarChart3, Wallet, Receipt, Smartphone, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { EncaissementsMensuelsChart } from "@/components/admin/statistiques/EncaissementsMensuelsChart";
import { EncaissementsParSiteChart } from "@/components/admin/statistiques/EncaissementsParSiteChart";
import { moisVisiblesRetard } from "@/lib/paiements";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

interface PaiementRow {
  montant_paye: number;
  mode_paiement: string;
  mois_souscription: MoisScolaire;
  eleves: { classe_id: number; classes: { site_id: number; sites: { nom_site: string } | null } | null } | null;
}

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: { annee_id?: string; site_id?: string; classe_id?: string; mois?: string };
}) {
  const supabase = createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Statistiques financières" />
        <EmptyState icon={BarChart3} title="Non autorisé" description="Cette page ne vous est pas accessible." />
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

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = searchParams.site_id
    ? (classes ?? []).filter((c) => String(c.site_id) === searchParams.site_id)
    : classes ?? [];

  let paiements: PaiementRow[] = [];

  if (anneeSelectionnee) {
    // Pas de filtre `mois` ici — récupéré une fois pour l'année/site/classe
    // sélectionnés, puis affiné en mémoire : le graphique mensuel a besoin de
    // tous les mois, les KPI eux respectent le filtre mois s'il est présent.
    let query = supabase
      .from("paiements")
      .select("montant_paye, mode_paiement, mois_souscription, eleves!inner(classe_id, classes!inner(site_id, sites(nom_site)))")
      .eq("annee_scolaire_id", anneeSelectionnee.id);

    if (searchParams.site_id) query = query.eq("eleves.classes.site_id", searchParams.site_id);
    if (searchParams.classe_id) query = query.eq("eleves.classe_id", searchParams.classe_id);

    const { data } = await query;
    paiements = (data ?? []) as unknown as PaiementRow[];
  }

  const paiementsKpi = searchParams.mois
    ? paiements.filter((p) => p.mois_souscription === searchParams.mois)
    : paiements;

  const totalEncaisse = paiementsKpi.reduce((s, p) => s + p.montant_paye, 0);
  const nbPaiements = paiementsKpi.length;
  const paiementMoyen = nbPaiements > 0 ? Math.round(totalEncaisse / nbPaiements) : 0;
  const totalMomo = paiementsKpi.filter((p) => p.mode_paiement === "MoMo").reduce((s, p) => s + p.montant_paye, 0);
  const pctMomo = totalEncaisse > 0 ? Math.round((totalMomo / totalEncaisse) * 100) : 0;

  // Taux de recouvrement — uniquement calculable pour l'année en_cours : c'est
  // la seule pour laquelle "élèves actifs aujourd'hui" est une approximation
  // valable de "qui devait payer". Pour une année en_pause/terminee, le
  // périmètre des élèves a bougé depuis (passages, sorties) — plutôt afficher
  // "—" qu'un chiffre trompeur. Approximation assumée même sur l'année en
  // cours : ne tient pas compte des élèves inscrits en cours d'année (compte
  // les mois écoulés depuis la rentrée pour tout le monde, pas depuis la date
  // d'inscription individuelle) — suffisant pour un indicateur de pilotage.
  let tauxRecouvrement: number | null = null;
  if (anneeSelectionnee?.statut === "en_cours") {
    let queryElevesScope = supabase.from("eleves").select("classe_id, classes!inner(site_id)").eq("statut", "actif");
    if (searchParams.site_id) queryElevesScope = queryElevesScope.eq("classes.site_id", searchParams.site_id);
    if (searchParams.classe_id) queryElevesScope = queryElevesScope.eq("classe_id", searchParams.classe_id);
    const [{ data: elevesScope }, { data: fraisTdRows }] = await Promise.all([
      queryElevesScope,
      supabase.from("frais_td").select("classe_id, montant"),
    ]);

    const montantParClasse = new Map((fraisTdRows ?? []).map((f) => [f.classe_id, Number(f.montant)]));
    const montantMensuelAttendu = (elevesScope ?? []).reduce((s, e) => s + (montantParClasse.get(e.classe_id) ?? 0), 0);
    const nbMois = searchParams.mois ? 1 : moisVisiblesRetard(new Date()).length;
    const montantAttendu = montantMensuelAttendu * nbMois;

    tauxRecouvrement = montantAttendu > 0 ? Math.round((totalEncaisse / montantAttendu) * 100) : null;
  }

  const parMois = new Map<MoisScolaire, number>();
  for (const p of paiements) {
    parMois.set(p.mois_souscription, (parMois.get(p.mois_souscription) ?? 0) + p.montant_paye);
  }
  const donneesMensuelles = MOIS_SCOLAIRES.map((m) => ({ mois: m, montant: parMois.get(m) ?? 0 }));

  const parSite = new Map<string, number>();
  for (const p of paiementsKpi) {
    const nomSite = p.eleves?.classes?.sites?.nom_site ?? "?";
    parSite.set(nomSite, (parSite.get(nomSite) ?? 0) + p.montant_paye);
  }
  const donneesParSite = Array.from(parSite.entries()).map(([site, montant]) => ({ site, montant }));

  return (
    <div>
      <PageHeader title="Statistiques financières" subtitle="Encaissements filtrés par année, site, classe et mois" />

      <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <select name="annee_id" defaultValue={anneeSelectionnee?.id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          {anneesList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </select>
        <select name="site_id" defaultValue={searchParams.site_id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Tous les sites</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom_site}
            </option>
          ))}
        </select>
        <select name="classe_id" defaultValue={searchParams.classe_id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Toutes les classes</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {searchParams.site_id ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
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
        <button type="submit" className="hidden">
          Filtrer
        </button>
      </form>

      {!anneeSelectionnee ? (
        <EmptyState icon={BarChart3} title="Aucune année scolaire" description="Configurez une année scolaire pour voir des statistiques." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KpiCard icon={Wallet} label="Total encaissé" value={`${totalEncaisse.toLocaleString("fr-FR")} F`} />
            <KpiCard icon={Receipt} label="Paiements enregistrés" value={nbPaiements} />
            <KpiCard icon={Receipt} label="Paiement moyen" value={`${paiementMoyen.toLocaleString("fr-FR")} F`} />
            <KpiCard icon={Smartphone} label="Part MoMo" value={`${pctMomo}%`} />
            <KpiCard icon={TrendingUp} label="Taux de recouvrement" value={tauxRecouvrement !== null ? `${tauxRecouvrement}%` : "—"} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <EncaissementsMensuelsChart data={donneesMensuelles} />
            <EncaissementsParSiteChart data={donneesParSite} />
          </div>
        </>
      )}
    </div>
  );
}
