import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { MODE_PAIEMENT_LABELS, type ModePaiement } from "@/lib/constants";

interface PaiementSupprimeRow {
  id: number;
  matricule: string;
  mois_souscription: string;
  montant_paye: number;
  date_paiement: string;
  mode_paiement: ModePaiement;
  date_suppression: string;
  motif: string;
  users: { username: string } | null;
}

/**
 * Réservé coordonnateur/comptable (interdit #17 — le superviseur enregistre
 * mais ne supprime ni ne consulte les suppressions). RLS sur
 * `paiements_supprimes` bloque déjà les autres rôles, mais on utilise ici le
 * client service role pour le join vers `users` (username du responsable) :
 * la policy `users_lecture_soi_meme` ne permet de lire que sa PROPRE ligne,
 * donc le client RLS renverrait `null` pour toute suppression faite par un
 * autre compte. §5.5 GSR_ARCHITECTURE.md — le rôle est vérifié explicitement
 * avant d'utiliser le service role, qui lui bypass RLS entièrement.
 */
export default async function PaiementsSupprimesPage() {
  const scope = await getUserScope(await createClient());

  if (scope.role !== "coordonnateur" && scope.role !== "comptable") {
    return (
      <div>
        <PageHeader title="Paiements supprimés" />
        <PaiementsNav active="supprimes" role={scope.role} />
        <EmptyState icon={History} title="Non autorisé" description="Cette page est réservée au coordonnateur et au comptable." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  const { data: paiements } = await supabaseAdmin
    .from("paiements_supprimes")
    .select("id, matricule, mois_souscription, montant_paye, date_paiement, mode_paiement, date_suppression, motif, users(username)")
    .order("date_suppression", { ascending: false });

  const rows = (paiements ?? []) as unknown as PaiementSupprimeRow[];

  const columns: DataTableColumn<PaiementSupprimeRow>[] = [
    { key: "matricule", label: "Matricule", render: (p) => <span className="font-mono text-xs">{p.matricule}</span> },
    { key: "mois", label: "Mois", render: (p) => p.mois_souscription },
    { key: "montant", label: "Montant", render: (p) => `${p.montant_paye} F` },
    { key: "date_paiement", label: "Date du paiement", render: (p) => p.date_paiement },
    { key: "mode", label: "Mode", render: (p) => MODE_PAIEMENT_LABELS[p.mode_paiement] },
    { key: "motif", label: "Motif", render: (p) => p.motif },
    { key: "par", label: "Supprimé par", render: (p) => p.users?.username ?? "—" },
    {
      key: "date_suppression",
      label: "Le",
      render: (p) => new Date(p.date_suppression).toLocaleString("fr-FR"),
    },
  ];

  return (
    <div>
      <PageHeader title="Paiements supprimés" subtitle="Traçabilité complète des suppressions" />
      <PaiementsNav active="supprimes" role={scope.role} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        emptyState={<EmptyState icon={History} title="Aucune suppression" description="Aucun paiement supprimé pour l'instant." />}
      />
    </div>
  );
}
