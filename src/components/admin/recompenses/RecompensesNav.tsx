import Link from "next/link";
import { Calendar, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { key: "mensuel", label: "Par mois", href: "/admin/recompenses", icon: Calendar },
  { key: "cumul", label: "Palmarès & Cumul", href: "/admin/recompenses/cumul", icon: Trophy },
] as const;

export function RecompensesNav({ active }: { active: (typeof ONGLETS)[number]["key"] }) {
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
