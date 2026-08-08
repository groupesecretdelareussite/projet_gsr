import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { NouvelUtilisateurDialog } from "@/components/admin/parametres/NouvelUtilisateurDialog";
import { ModifierUtilisateurDialog } from "@/components/admin/parametres/ModifierUtilisateurDialog";
import { ReinitialiserMotDePasseDialog } from "@/components/admin/parametres/ReinitialiserMotDePasseDialog";
import { DesactiverUtilisateurButton } from "@/components/admin/parametres/DesactiverUtilisateurButton";
import { SupprimerUtilisateurDialog } from "@/components/admin/parametres/SupprimerUtilisateurDialog";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";

interface UtilisateurRow {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  site_id: number | null;
  actif: boolean;
}

/**
 * Réservé coordonnateur (§5.4/§8.9). Liste via le client service role : la
 * policy `users_lecture_soi_meme` ne permet de lire que sa PROPRE ligne, donc
 * le client RLS ne renverrait qu'un seul utilisateur (soi-même) — même
 * raisonnement que `paiements/supprimes/page.tsx`.
 */
export default async function UtilisateursPage() {
  const scope = await getUserScope(await createClient());

  if (scope.role !== "coordonnateur") {
    return (
      <div>
        <PageHeader title="Utilisateurs" />
        <EmptyState icon={Users} title="Non autorisé" description="Cette page est réservée au coordonnateur." />
      </div>
    );
  }

  const supabaseAdmin = createServiceRoleClient();
  const [{ data: utilisateurs }, { data: sites }, { data: userSites }] = await Promise.all([
    supabaseAdmin.from("users").select("id, username, email, role, site_id, actif").order("username"),
    supabaseAdmin.from("sites").select("id, nom_site").order("nom_site"),
    supabaseAdmin.from("user_sites").select("user_id, site_id"),
  ]);

  const rows = (utilisateurs ?? []) as UtilisateurRow[];
  const sitesList = sites ?? [];
  const nomSiteParId = new Map(sitesList.map((s) => [s.id, s.nom_site]));

  const siteIdsParUser = new Map<string, number[]>();
  for (const us of userSites ?? []) {
    const liste = siteIdsParUser.get(us.user_id) ?? [];
    liste.push(us.site_id);
    siteIdsParUser.set(us.user_id, liste);
  }

  const columns: DataTableColumn<UtilisateurRow>[] = [
    { key: "username", label: "Username", render: (u) => <span className="font-medium">{u.username}</span> },
    { key: "email", label: "Email", render: (u) => u.email },
    { key: "role", label: "Rôle", render: (u) => <Badge variant="neutral">{ROLE_LABELS[u.role]}</Badge> },
    {
      key: "sites",
      label: "Site(s)",
      render: (u) => {
        if (u.role === "chef_site") return u.site_id ? nomSiteParId.get(u.site_id) ?? "—" : "—";
        if (u.role === "superviseur") {
          const ids = siteIdsParUser.get(u.id) ?? [];
          return ids.length > 0 ? ids.map((id) => nomSiteParId.get(id)).join(", ") : "Aucun site assigné";
        }
        return "Tous";
      },
    },
    {
      key: "statut",
      label: "Statut",
      render: (u) => <Badge variant={u.actif ? "success" : "danger"}>{u.actif ? "Actif" : "Désactivé"}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (u) => (
        <div className={`flex flex-wrap gap-2 ${ACTIONS_HOVER_REVEAL}`}>
          <ModifierUtilisateurDialog
            userId={u.id}
            initialUsername={u.username}
            initialRole={u.role}
            initialSiteId={u.site_id}
            initialSiteIds={siteIdsParUser.get(u.id) ?? []}
            sites={sitesList}
            estSoiMeme={u.id === scope.userId}
          />
          <ReinitialiserMotDePasseDialog userId={u.id} username={u.username} />
          {u.id !== scope.userId && <DesactiverUtilisateurButton userId={u.id} username={u.username} actif={u.actif} />}
          {u.id !== scope.userId && <SupprimerUtilisateurDialog userId={u.id} username={u.username} />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle={`${rows.length} compte(s) staff`}
        actions={<NouvelUtilisateurDialog sites={sitesList} />}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        emptyState={<EmptyState icon={Users} title="Aucun utilisateur" description="Créez le premier compte staff." />}
      />
    </div>
  );
}
