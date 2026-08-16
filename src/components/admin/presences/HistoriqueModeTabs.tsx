import Link from "next/link";
import { Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  { key: "classe", label: "Par classe", href: "/admin/presences/historique/classe", icon: Users },
  { key: "eleve", label: "Par élève", href: "/admin/presences/historique/eleve", icon: User },
] as const;

/**
 * Sous-onglets internes à Historique — distincts de PresencesNav (qui reste
 * sur "Historique"), même style de soulignement. Contrairement à
 * PresencesNav, le libellé reste toujours visible ici (pas de `hidden sm:` —
 * choix volontaire, ces deux libellés courts n'ont pas besoin de se réduire
 * à l'icône seule sur mobile).
 */
export function HistoriqueModeTabs({ active }: { active: (typeof MODES)[number]["key"] }) {
  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
      {MODES.map((m) => {
        const Icon = m.icon;
        return (
          <Link key={m.key} href={m.href}>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                active === m.key ? "text-primary border-primary" : "text-gray-500 border-transparent hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{m.label}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
