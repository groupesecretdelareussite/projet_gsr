import { UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { ReinscrireButton } from "@/components/admin/eleves/ReinscrireButton";
import { RAISON_LABELS } from "@/lib/constants";

interface EleveSuspenduRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
  eleves_suspendus: { raison: string; motif: string; montant_du: number; date_suspension: string }[];
}

export default async function ElevesSuspendusPage() {
  const supabase = createClient();

  const { data: eleves } = await supabase
    .from("eleves")
    .select(
      "id, matricule, nom, prenoms, classes(nom_classe, sites(nom_site)), eleves_suspendus(raison, motif, montant_du, date_suspension)"
    )
    .eq("statut", "suspendu")
    .order("nom");

  const rows = (eleves ?? []) as unknown as EleveSuspenduRow[];

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
    { key: "motif", label: "Motif", render: (e) => e.eleves_suspendus[0]?.motif ?? "—" },
    {
      key: "montant_du",
      label: "Montant dû",
      render: (e) => {
        const montant = e.eleves_suspendus[0]?.montant_du ?? 0;
        return montant > 0 ? <span className="text-red-600 font-semibold">{montant} F</span> : "0 F";
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (e) => <ReinscrireButton eleveId={e.id} montantDu={e.eleves_suspendus[0]?.montant_du ?? 0} />,
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
