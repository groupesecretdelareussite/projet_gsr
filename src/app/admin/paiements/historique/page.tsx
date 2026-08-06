import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { SupprimerPaiementDialog } from "@/components/admin/paiements/SupprimerPaiementDialog";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";
import { MODE_PAIEMENT_LABELS, MOIS_SCOLAIRES, type ModePaiement } from "@/lib/constants";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface PaiementRow {
  id: number;
  mois_souscription: string;
  montant_paye: number;
  date_paiement: string;
  mode_paiement: ModePaiement;
  eleves: {
    matricule: string;
    nom: string;
    prenoms: string;
    classes: { nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
  } | null;
}

export default async function HistoriquePaiementsPage(
  props: {
    searchParams: Promise<{ annee_scolaire_id?: string; site_id?: string; classe_id?: string; mois?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const peutSupprimer = scope.role === "coordonnateur" || scope.role === "comptable";

  const [{ data: sites }, { data: classes }, { data: annees }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
    supabase.from("annees_scolaires").select("id, libelle, statut").order("date_debut", { ascending: false }),
  ]);

  const anneeParDefaut = annees?.find((a) => a.statut === "en_cours")?.id;

  let query = supabase
    .from("paiements")
    .select(
      "id, mois_souscription, montant_paye, date_paiement, mode_paiement, eleves!inner(matricule, nom, prenoms, classes!inner(nom_classe, site_id, sites(nom_site)))"
    )
    .order("date_paiement", { ascending: false });

  const anneeFiltre = searchParams.annee_scolaire_id ?? (anneeParDefaut ? String(anneeParDefaut) : undefined);
  const siteIdEffectif =
    searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);
  if (anneeFiltre) query = query.eq("annee_scolaire_id", anneeFiltre);
  if (siteIdEffectif) query = query.eq("eleves.classes.site_id", siteIdEffectif);
  if (searchParams.classe_id) query = query.eq("eleves.classe_id", searchParams.classe_id);
  if (searchParams.mois) query = query.eq("mois_souscription", searchParams.mois);

  const { data: paiements } = await query;
  const rows = (paiements ?? []) as unknown as PaiementRow[];

  const columns: DataTableColumn<PaiementRow>[] = [
    { key: "date", label: "Date", render: (p) => p.date_paiement },
    {
      key: "eleve",
      label: "Élève",
      render: (p) => (
        <span>
          <span className="font-medium">{p.eleves?.nom} {p.eleves?.prenoms}</span>{" "}
          <span className="text-gray-400 font-mono text-xs">{p.eleves?.matricule}</span>
        </span>
      ),
    },
    { key: "classe", label: "Classe", render: (p) => p.eleves?.classes?.nom_classe ?? "—" },
    { key: "site", label: "Site", render: (p) => p.eleves?.classes?.sites?.nom_site ?? "—" },
    { key: "mois", label: "Mois", render: (p) => p.mois_souscription },
    { key: "montant", label: "Montant", render: (p) => `${p.montant_paye} F` },
    { key: "mode", label: "Mode", render: (p) => MODE_PAIEMENT_LABELS[p.mode_paiement] },
    ...(peutSupprimer
      ? [
          {
            key: "actions",
            label: "Actions",
            render: (p: PaiementRow) => (
              <div className={ACTIONS_HOVER_REVEAL}>
                <SupprimerPaiementDialog
                  paiementId={p.id}
                  description={`${p.eleves?.nom} ${p.eleves?.prenoms} — ${p.mois_souscription} — ${p.montant_paye} F`}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Historique des paiements" subtitle={`${rows.length} paiement(s)`} />
      <PaiementsNav active="historique" role={scope.role} />

      <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <select
          name="annee_scolaire_id"
          defaultValue={anneeFiltre ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {annees?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </select>
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
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom_classe}
            </option>
          ))}
        </select>
        <select
          name="mois"
          defaultValue={searchParams.mois ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous les mois</option>
          {MOIS_SCOLAIRES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        emptyState={
          <EmptyState icon={Wallet} title="Aucun paiement" description="Aucun paiement ne correspond aux filtres actuels." />
        }
      />
    </div>
  );
}
