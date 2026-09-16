import Link from "next/link";
import { ClipboardCheck, Clock, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { key: "appel", label: "Appel du jour", href: "/admin/presences", icon: ClipboardCheck },
  { key: "retardataires", label: "Retardataires", href: "/admin/presences/retardataires", icon: Clock },
  { key: "historique", label: "Historique", href: "/admin/presences/historique/classe", icon: History },
] as const;

/**
 * Onglets de navigation Présences.
 * Sur mobile : l'onglet actif affiche son icône et son libellé,
 * tandis que les onglets inactifs n'affichent que leur icône (libellé masqué sous `sm:`).
 * Actif = soulignement et couleur primaire.
 */
export function PresencesNav({ active }: { active: (typeof ONGLETS)[number]["key"] }) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
      {ONGLETS.map((onglet) => {
        const Icon = onglet.icon;
        const isActive = active === onglet.key;
        return (
          <Link key={onglet.key} href={onglet.href} prefetch={true}>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                isActive ? "text-primary border-primary" : "text-gray-500 border-transparent hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={isActive ? "inline" : "hidden sm:inline"}>{onglet.label}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
