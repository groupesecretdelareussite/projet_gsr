import Link from "next/link";
import { cn } from "@/lib/utils";
import { ActionsBar } from "@/components/admin/ActionsBar";
import type { UserRole } from "@/lib/constants";

const ONGLETS = [
  { key: "enregistrer", label: "Enregistrer", href: "/admin/paiements/enregistrer" },
  { key: "historique", label: "Historique", href: "/admin/paiements/historique" },
  { key: "a-jour", label: "À jour", href: "/admin/paiements/a-jour" },
  { key: "en-retard", label: "En retard", href: "/admin/paiements/en-retard" },
  {
    key: "supprimes",
    label: "Supprimés",
    href: "/admin/paiements/supprimes",
    // interdit #17 — suppression et donc consultation de l'historique de suppression réservées coordonnateur/comptable
    roles: ["coordonnateur", "comptable"] as UserRole[],
  },
] as const;

export function PaiementsNav({ active, role }: { active: (typeof ONGLETS)[number]["key"]; role: UserRole }) {
  const onglets = ONGLETS.filter((o) => !("roles" in o) || (o.roles as UserRole[]).includes(role));

  return (
    <ActionsBar>
      {onglets.map((onglet) => (
        <Link key={onglet.key} href={onglet.href}>
          <span
            className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              active === onglet.key ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {onglet.label}
          </span>
        </Link>
      ))}
    </ActionsBar>
  );
}
