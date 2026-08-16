import Link from "next/link";
import { ClipboardCheck, Clock, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { key: "appel", label: "Appel du jour", href: "/admin/presences", icon: ClipboardCheck },
  { key: "retardataires", label: "Retardataires", href: "/admin/presences/retardataires", icon: Clock },
  { key: "historique", label: "Historique", href: "/admin/presences/historique/classe", icon: History },
] as const;

/**
 * Onglets toujours alignés sur une seule ligne (pas de flex-wrap comme
 * ActionsBar — un menu qui casse sur deux lignes selon l'écran n'est jamais
 * acceptable pour une nav) : icône toujours visible, libellé masqué sous
 * `sm:` (même convention que `ActionsBarLabel`), `overflow-x-auto` en filet
 * de sécurité. Actif = soulignement, pas un fond plein.
 */
export function PresencesNav({ active }: { active: (typeof ONGLETS)[number]["key"] }) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
      {ONGLETS.map((onglet) => {
        const Icon = onglet.icon;
        return (
          <Link key={onglet.key} href={onglet.href}>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                active === onglet.key ? "text-primary border-primary" : "text-gray-500 border-transparent hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{onglet.label}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
