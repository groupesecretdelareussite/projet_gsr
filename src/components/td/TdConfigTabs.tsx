"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollFadeX } from "@/components/shared/ScrollFadeX";

const TABS = [
  { label: "Zones", href: "/td/coord/config/zones" },
  { label: "Matières TD", href: "/td/coord/config/matieres" },
  { label: "Professeurs", href: "/td/coord/config/professeurs" },
  { label: "Inscriptions en attente", href: "/td/coord/config/inscriptions", badge: true },
];

export function TdConfigTabs({ nombreInscriptionsEnAttente }: { nombreInscriptionsEnAttente?: number } = {}) {
  const pathname = usePathname();

  return (
    <ScrollFadeX className="mb-6" fadeClassName="from-surface">
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto no-scrollbar scroll-smooth">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const showBadge = tab.badge && !!nombreInscriptionsEnAttente && nombreInscriptionsEnAttente > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <span>{tab.label}</span>
              {showBadge && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-amber-500 rounded-full">
                  {nombreInscriptionsEnAttente}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </ScrollFadeX>
  );
}
