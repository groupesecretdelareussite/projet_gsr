"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Zones", href: "/td/coord/config/zones" },
  { label: "Classes TD", href: "/td/coord/config/classes" },
  { label: "Matières TD", href: "/td/coord/config/matieres" },
  { label: "Professeurs", href: "/td/coord/config/professeurs" },
];

export function TdConfigTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
