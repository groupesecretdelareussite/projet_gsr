import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { MarquerLuButton } from "@/components/admin/notifications/MarquerLuButton";
import { ToutMarquerLuButton } from "@/components/admin/notifications/ToutMarquerLuButton";

interface NotificationRow {
  id: number;
  contenu: string;
  lu: boolean;
  date_creation: string;
  sites: { nom_site: string } | null;
}

const LIMITE = 100;

function dateComplete(dateIso: string): string {
  return new Date(dateIso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * §5.8/§8.1 GSR_ARCHITECTURE.md — historique complet, complément de la
 * cloche Topbar (limitée aux 20 dernières + pas de filtre). RLS
 * (`notifications_acces`) filtre déjà par périmètre : coordonnateur/
 * comptable voient tout, superviseur uniquement ses sites — client RLS
 * suffit ici, pas besoin de service role pour la lecture.
 */
export default async function NotificationsPage({ searchParams }: { searchParams: { statut?: string } }) {
  const supabase = createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <EmptyState icon={Bell} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const statut = searchParams.statut ?? "toutes";

  let query = supabase
    .from("notifications")
    .select("id, contenu, lu, date_creation, sites(nom_site)")
    .order("date_creation", { ascending: false })
    .limit(LIMITE);
  if (statut === "non_lues") query = query.eq("lu", false);
  if (statut === "lues") query = query.eq("lu", true);

  const [{ data: notifications }, { data: nonLuesIdsData }] = await Promise.all([
    query,
    supabase.from("notifications").select("id").eq("lu", false),
  ]);

  const rows = (notifications ?? []) as unknown as NotificationRow[];
  const idsNonLues = (nonLuesIdsData ?? []).map((n) => n.id);

  const columns: DataTableColumn<NotificationRow>[] = [
    {
      key: "statut",
      label: "",
      render: (n) => (n.lu ? <Badge variant="neutral">Lue</Badge> : <Badge variant="warning">Non lue</Badge>),
    },
    { key: "contenu", label: "Notification", render: (n) => <span className={n.lu ? "text-gray-500" : "font-medium text-gray-900"}>{n.contenu}</span> },
    { key: "site", label: "Site", render: (n) => n.sites?.nom_site ?? "—" },
    { key: "date", label: "Date", render: (n) => dateComplete(n.date_creation) },
    {
      key: "actions",
      label: "Actions",
      render: (n) => (!n.lu ? <MarquerLuButton id={n.id} /> : null),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${idsNonLues.length} non lue(s)`}
        actions={idsNonLues.length > 0 ? <ToutMarquerLuButton ids={idsNonLues} /> : undefined}
      />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-md">
        <select name="statut" defaultValue={statut} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="toutes">Toutes</option>
          <option value="non_lues">Non lues</option>
          <option value="lues">Lues</option>
        </select>
        <AutoSubmitOnChange />
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(n) => n.id}
        emptyState={<EmptyState icon={Bell} title="Aucune notification" description="Rien à afficher pour ce filtre." />}
      />
    </div>
  );
}
