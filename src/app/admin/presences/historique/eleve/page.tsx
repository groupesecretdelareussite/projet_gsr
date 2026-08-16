import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { PresencesNav } from "@/components/admin/presences/PresencesNav";
import { HistoriqueModeTabs } from "@/components/admin/presences/HistoriqueModeTabs";
import { HistoriqueEleveFiltre } from "@/components/admin/presences/HistoriqueEleveFiltre";
import type { EleveResultat } from "@/components/admin/EleveAutocomplete";
import { plageDatesMoisScolaire } from "@/lib/presences";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

interface LigneHistorique {
  date_presence: string;
  present: boolean;
}

export default async function HistoriqueElevePage(
  props: { searchParams: Promise<{ eleve_id?: string; mois?: string }> }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Historique des présences" />
        <EmptyState icon={ClipboardList} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const eleveId = searchParams.eleve_id ? Number(searchParams.eleve_id) : undefined;
  const mois = MOIS_SCOLAIRES.includes(searchParams.mois as MoisScolaire) ? (searchParams.mois as MoisScolaire) : undefined;

  let eleveSelectionne: EleveResultat | null = null;
  let historique: LigneHistorique[] = [];

  if (eleveId) {
    const { data } = await supabase
      .from("eleves")
      .select("id, matricule, nom, prenoms, classes(nom_classe, sites(nom_site))")
      .eq("id", eleveId)
      .maybeSingle();
    eleveSelectionne = data as unknown as EleveResultat | null;
  }

  if (eleveSelectionne && mois) {
    const { data: anneeEnCours } = await supabase
      .from("annees_scolaires")
      .select("date_debut, date_fin")
      .eq("statut", "en_cours")
      .maybeSingle();

    if (anneeEnCours) {
      const { debut, fin } = plageDatesMoisScolaire(mois, { dateDebut: anneeEnCours.date_debut, dateFin: anneeEnCours.date_fin });
      const { data } = await supabase
        .from("presences")
        .select("date_presence, present")
        .eq("eleve_id", eleveId)
        .gte("date_presence", debut)
        .lte("date_presence", fin)
        .order("date_presence");
      historique = data ?? [];
    }
  }

  const columns: DataTableColumn<LigneHistorique>[] = [
    { key: "date", label: "Date", render: (h) => new Date(h.date_presence).toLocaleDateString("fr-FR") },
    {
      key: "statut",
      label: "Statut",
      render: (h) => <Badge variant={h.present ? "success" : "danger"}>{h.present ? "Présent" : "Absent"}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Historique des présences" subtitle="Par élève et par mois scolaire" />
      <PresencesNav active="historique" />
      <HistoriqueModeTabs active="eleve" />

      <HistoriqueEleveFiltre eleveInitial={eleveSelectionne} moisInitial={mois} />

      {!eleveSelectionne || !mois ? (
        <EmptyState icon={ClipboardList} title="Choisissez un élève et un mois" description="Recherchez un élève et sélectionnez un mois scolaire ci-dessus." />
      ) : historique.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune présence enregistrée" description={`Aucune présence enregistrée pour ${mois}.`} />
      ) : (
        <DataTable columns={columns} rows={historique} rowKey={(h) => h.date_presence} />
      )}
    </div>
  );
}
