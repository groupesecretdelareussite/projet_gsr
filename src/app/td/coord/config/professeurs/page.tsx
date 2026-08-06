import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { TdConfigTabs } from "@/components/td/TdConfigTabs";
import { NouveauProfesseurDialog } from "@/components/td/NouveauProfesseurDialog";
import { ModifierProfesseurDialog } from "@/components/td/ModifierProfesseurDialog";
import { ReinitialiserMotDePasseProfDialog } from "@/components/td/ReinitialiserMotDePasseProfDialog";
import { DesactiverProfesseurButton } from "@/components/td/DesactiverProfesseurButton";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";

interface ProfesseurRow {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  zone_id: number;
  matiere_principale_id: number;
  actif: boolean;
}

export default async function ProfesseursTDPage() {
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: professeurs }, { data: zones }, { data: matieres }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("professeurs")
      .select("id, nom, prenom, telephone, email, zone_id, matiere_principale_id, actif")
      .order("nom"),
    supabaseAdmin.schema("td").from("zones").select("id, nom_zone").order("nom_zone"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere"),
  ]);

  const rows = (professeurs ?? []) as ProfesseurRow[];
  const zonesOptions = (zones ?? []).map((z) => ({ id: z.id, nom: z.nom_zone }));
  const matieresOptions = (matieres ?? []).map((m) => ({ id: m.id, nom: m.nom_matiere }));
  const nomZoneParId = new Map(zonesOptions.map((z) => [z.id, z.nom]));
  const nomMatiereParId = new Map(matieresOptions.map((m) => [m.id, m.nom]));

  const columns: DataTableColumn<ProfesseurRow>[] = [
    {
      key: "nom",
      label: "Professeur",
      render: (p) => (
        <span className="font-medium">
          {p.prenom} {p.nom}
        </span>
      ),
    },
    { key: "contact", label: "Contact", render: (p) => <span className="text-xs">{p.email} — {p.telephone}</span> },
    { key: "zone", label: "Zone", render: (p) => nomZoneParId.get(p.zone_id) ?? "—" },
    { key: "matiere", label: "Matière principale", render: (p) => nomMatiereParId.get(p.matiere_principale_id) ?? "—" },
    {
      key: "statut",
      label: "Statut",
      render: (p) => <Badge variant={p.actif ? "success" : "danger"}>{p.actif ? "Actif" : "Désactivé"}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (p) => (
        <div className={`flex flex-wrap gap-2 ${ACTIONS_HOVER_REVEAL}`}>
          <ModifierProfesseurDialog
            professeurId={p.id}
            initialNom={p.nom}
            initialPrenom={p.prenom}
            initialTelephone={p.telephone}
            initialEmail={p.email}
            initialZoneId={p.zone_id}
            initialMatiereId={p.matiere_principale_id}
            zones={zonesOptions}
            matieres={matieresOptions}
          />
          <ReinitialiserMotDePasseProfDialog professeurId={p.id} nomComplet={`${p.prenom} ${p.nom}`} />
          <DesactiverProfesseurButton professeurId={p.id} nomComplet={`${p.prenom} ${p.nom}`} actif={p.actif} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Professeurs"
        subtitle={`${rows.length} professeur(s)`}
        actions={<NouveauProfesseurDialog zones={zonesOptions} matieres={matieresOptions} />}
      />
      <TdConfigTabs />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        emptyState={<EmptyState icon={GraduationCap} title="Aucun professeur" description="Créez le premier compte professeur." />}
      />
    </div>
  );
}
