import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn, type MobileCardConfig } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { MarquerLuButton } from "@/components/admin/notifications/MarquerLuButton";
import { ToutMarquerLuButton } from "@/components/admin/notifications/ToutMarquerLuButton";
import { ACTIONS_HOVER_REVEAL, cn } from "@/lib/utils";

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
 * comptable voient tout, superviseur/chef_site/secretaire uniquement leur(s)
 * site(s) — client RLS suffit ici, pas besoin de service role pour la
 * lecture, ni de filtre `site_id` manuel : chef_site/secretaire ont accès
 * depuis le 2026-08-16 (§discussion), la policy sql/020 les couvrait déjà.
 */
export default async function NotificationsPage(props: { searchParams: Promise<{ statut?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
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
      label: "Statut",
      render: (n) => (n.lu ? <Badge variant="neutral">Lue</Badge> : <Badge variant="warning">Non lue</Badge>),
    },
    { key: "contenu", label: "Notification", render: (n) => <span className={n.lu ? "text-gray-500" : "font-medium text-gray-900"}>{n.contenu}</span> },
    { key: "site", label: "Site", render: (n) => n.sites?.nom_site ?? "—" },
    { key: "date", label: "Date", render: (n) => dateComplete(n.date_creation) },
    {
      key: "actions",
      label: "Actions",
      render: (n) => (!n.lu ? <div className={ACTIONS_HOVER_REVEAL}><MarquerLuButton id={n.id} /></div> : null),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${idsNonLues.length} non lue(s)`}
        actions={idsNonLues.length > 0 ? <ToutMarquerLuButton ids={idsNonLues} /> : undefined}
      />

      <form method="get" className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 max-w-md">
        <select
          name="statut"
          defaultValue={statut}
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
        >
          <option value="toutes">Toutes</option>
          <option value="non_lues">Non lues</option>
          <option value="lues">Lues</option>
        </select>
        <AutoSubmitOnChange />
      </form>

      {(() => {
        const mobileCard: MobileCardConfig<NotificationRow> = {
          badge: (n) => (n.lu ? <Badge variant="neutral">Lue</Badge> : <Badge variant="warning">Non lue</Badge>),
          title: (n) => (
            <span className={cn("text-xs sm:text-sm", n.lu ? "text-gray-500 font-normal" : "text-gray-900 font-semibold")}>
              {n.contenu}
            </span>
          ),
          topRight: (n) => (!n.lu ? <MarquerLuButton id={n.id} /> : null),
          subtitle: (n) => (
            <>
              <span>{dateComplete(n.date_creation)}</span>
              {n.sites?.nom_site && (
                <>
                  <span>•</span>
                  <span>{n.sites.nom_site}</span>
                </>
              )}
            </>
          ),
        };

        return (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(n) => n.id}
            mobileCard={mobileCard}
            emptyState={<EmptyState icon={Bell} title="Aucune notification" description="Rien à afficher pour ce filtre." />}
          />
        );
      })()}
    </div>
  );
}
