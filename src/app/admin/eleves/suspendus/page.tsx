import { UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { ReinscrireDialog } from "@/components/admin/eleves/ReinscrireDialog";
import { RAISON_LABELS, type MoisScolaire } from "@/lib/constants";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";
import { estVenuDansLeMois } from "@/lib/reinscription";

interface EleveSuspenduRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
  eleves_suspendus: { raison: string; motif: string; montant_du: number; mois_souscription: string | null; date_suspension: string }[];
  estVenuDansLeMois: boolean | null;
}

export default async function ElevesSuspendusPage() {
  const supabase = await createClient();

  const [{ data: eleves }, { data: anneeEnCours }] = await Promise.all([
    supabase
      .from("eleves")
      .select(
        "id, matricule, nom, prenoms, classes(nom_classe, sites(nom_site)), eleves_suspendus(raison, motif, montant_du, mois_souscription, date_suspension)"
      )
      .eq("statut", "suspendu")
      .order("nom"),
    supabase.from("annees_scolaires").select("date_debut").eq("statut", "en_cours").maybeSingle(),
  ]);

  const rows: EleveSuspenduRow[] = await Promise.all(
    ((eleves ?? []) as unknown as Omit<EleveSuspenduRow, "estVenuDansLeMois">[]).map(async (e) => {
      const suspension = e.eleves_suspendus[0];
      const doitVerifier = suspension?.raison === "defaut_paiement" && suspension.montant_du > 0 && suspension.mois_souscription && anneeEnCours;
      const estVenu = doitVerifier
        ? await estVenuDansLeMois(supabase, e.id, suspension.mois_souscription as MoisScolaire, anneeEnCours.date_debut)
        : null;
      return { ...e, estVenuDansLeMois: estVenu };
    })
  );

  const columns: DataTableColumn<EleveSuspenduRow>[] = [
    { key: "matricule", label: "Matricule", render: (e) => <span className="font-mono text-xs">{e.matricule}</span> },
    { key: "nom", label: "Nom", render: (e) => `${e.nom} ${e.prenoms}` },
    { key: "classe", label: "Classe / Site", render: (e) => `${e.classes?.nom_classe ?? "—"} — ${e.classes?.sites?.nom_site ?? "—"}` },
    {
      key: "raison",
      label: "Raison",
      render: (e) => {
        const raison = e.eleves_suspendus[0]?.raison as keyof typeof RAISON_LABELS | undefined;
        return raison ? <Badge variant="warning">{RAISON_LABELS[raison]}</Badge> : "—";
      },
    },
    {
      key: "motif",
      label: "Motif",
      render: (e) => {
        const motif = e.eleves_suspendus[0]?.motif;
        return motif ? (
          <span className="block max-w-[220px] truncate" title={motif}>
            {motif}
          </span>
        ) : (
          "—"
        );
      },
    },
    {
      key: "montant_du",
      label: "Montant dû",
      render: (e) => {
        const montant = e.eleves_suspendus[0]?.montant_du ?? 0;
        if (montant === 0) return "0 F";
        if (e.estVenuDansLeMois === false) return <span className="text-gray-400 italic">Sera exonéré (absence)</span>;
        return <span className="text-red-600 font-semibold">{montant} F</span>;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (e) => {
        const suspension = e.eleves_suspendus[0];
        return (
          <div className={ACTIONS_HOVER_REVEAL}>
            <ReinscrireDialog
              eleveId={e.id}
              nomComplet={`${e.nom} ${e.prenoms}`}
              raison={suspension?.raison ?? ""}
              montantDu={suspension?.montant_du ?? 0}
              moisSouscription={suspension?.mois_souscription ?? null}
              estVenuDansLeMois={e.estVenuDansLeMois}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Élèves suspendus" subtitle={`${rows.length} élève(s) suspendu(s)`} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        emptyState={<EmptyState icon={UserX} title="Aucun élève suspendu" />}
      />
    </div>
  );
}
