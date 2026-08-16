import Link from "next/link";
import { PlusCircle, History, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/constants";

const ONGLETS = [
  { key: "enregistrer", label: "Enregistrer", href: "/admin/paiements/enregistrer", icon: PlusCircle },
  { key: "historique", label: "Historique", href: "/admin/paiements/historique", icon: History },
  { key: "a-jour", label: "À jour", href: "/admin/paiements/a-jour", icon: CheckCircle2 },
  { key: "en-retard", label: "En retard", href: "/admin/paiements/en-retard", icon: AlertTriangle },
  {
    key: "supprimes",
    label: "Supprimés",
    href: "/admin/paiements/supprimes",
    icon: Trash2,
    // interdit #17 — suppression et donc consultation de l'historique de suppression réservées coordonnateur/comptable
    roles: ["coordonnateur", "comptable"] as UserRole[],
  },
] as const;

/** Même traitement que PresencesNav (2026-08-16) : une seule ligne, icône + libellé masqué sous `sm:`, actif = soulignement. */
export function PaiementsNav({ active, role }: { active: (typeof ONGLETS)[number]["key"]; role: UserRole }) {
  const onglets = ONGLETS.filter((o) => !("roles" in o) || (o.roles as UserRole[]).includes(role));

  return (
    <div className="flex items-center gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
      {onglets.map((onglet) => {
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
