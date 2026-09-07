import { UserCheck, CheckCircle2, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { TdConfigTabs } from "@/components/td/TdConfigTabs";
import { DetailInscriptionDialog, type DemandeInscription } from "@/components/td/DetailInscriptionDialog";

export default async function InscriptionsEnAttentePage() {
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: professeurs }, { data: zones }, { data: matieres }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("professeurs")
      .select("id, nom, prenom, telephone, email, zone_id, matiere_principale_id, date_inscription, valide")
      .eq("valide", false)
      .order("date_inscription", { ascending: false }),
    supabaseAdmin.schema("td").from("zones").select("id, nom_zone").order("nom_zone"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere"),
  ]);

  const nomZoneParId = new Map((zones ?? []).map((z) => [z.id, z.nom_zone]));
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));

  const demandes: DemandeInscription[] = (professeurs ?? []).map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    email: p.email,
    telephone: p.telephone,
    zoneId: p.zone_id,
    nomZone: nomZoneParId.get(p.zone_id) ?? "—",
    matiereId: p.matiere_principale_id,
    nomMatiere: nomMatiereParId.get(p.matiere_principale_id) ?? "—",
    dateInscription: p.date_inscription,
  }));

  const columns: DataTableColumn<DemandeInscription>[] = [
    {
      key: "professeur",
      label: "Professeur",
      render: (d) => (
        <div>
          <span className="font-semibold text-gray-900 block">
            {d.prenom} {d.nom}
          </span>
          <span className="text-xs text-gray-400 block sm:hidden">
            {d.nomMatiere} • {d.nomZone}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date de demande",
      render: (d) => {
        const date = new Date(d.dateInscription);
        const formatted = date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{formatted}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Action",
      render: (d) => (
        <div className="flex justify-end">
          <DetailInscriptionDialog demande={d} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inscriptions en attente"
        subtitle={`${demandes.length} demande(s) en attente de validation`}
      />
      <TdConfigTabs nombreInscriptionsEnAttente={demandes.length} />
      <DataTable
        columns={columns}
        rows={demandes}
        rowKey={(d) => d.id}
        emptyState={
          <EmptyState
            icon={CheckCircle2}
            title="Aucune inscription en attente"
            description="Toutes les demandes de création de compte ont été traitées. Les nouvelles inscriptions apparaîtront ici."
          />
        }
      />
    </div>
  );
}
