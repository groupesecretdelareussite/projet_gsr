import Link from "next/link";
import { ClipboardCheck, Clock, CalendarCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/constants";

interface PresencesNavProps {
  active: "appel" | "retardataires" | "historique";
  role?: UserRole;
}

/**
 * Onglets de navigation Présences.
 * Pour coordonnateur et comptable : l'onglet s'appelle "Régularisation" (icône CalendarCheck).
 * Pour les autres rôles (chef_site, secretaire, superviseur) : l'onglet s'appelle "Retardataires" (icône Clock).
 * Sur mobile : l'onglet actif affiche son icône et son libellé,
 * tandis que les onglets inactifs n'affichent que leur icône (libellé masqué sous `sm:`).
 * Actif = soulignement et couleur primaire.
 */
export function PresencesNav({ active, role }: PresencesNavProps) {
  const estGestionnaire = role === "coordonnateur" || role === "comptable";

  const onglets = [
    { key: "appel" as const, label: "Appel du jour", href: "/admin/presences", icon: ClipboardCheck },
    {
      key: "retardataires" as const,
      label: estGestionnaire ? "Régularisation" : "Retardataires",
      href: "/admin/presences/retardataires",
      icon: estGestionnaire ? CalendarCheck : Clock,
    },
    { key: "historique" as const, label: "Historique", href: "/admin/presences/historique/classe", icon: History },
  ];

  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
      {onglets.map((onglet) => {
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

