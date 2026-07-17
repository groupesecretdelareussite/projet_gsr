"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  NotebookText,
  Wallet,
  BarChart3,
  Calculator,
  GraduationCap,
  Bell,
  Images,
  Settings,
  Sparkles,
  CalendarClock,
  UserPlus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserScope } from "@/hooks/useUserScope";
import { logout } from "@/actions/auth";
import type { UserRole } from "@/lib/constants";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  enabled: boolean; // false = fonctionnalité pas encore construite (milestone à venir)
}

const ROLES_INSCRIPTION: UserRole[] = ["coordonnateur", "comptable", "superviseur"];

const NAV_ITEMS: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/admin/tableau-de-bord",
    icon: LayoutDashboard,
    roles: ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"],
    enabled: true,
  },
  {
    label: "Élèves",
    href: "/admin/eleves/liste",
    icon: Users,
    roles: ["coordonnateur", "comptable", "superviseur", "chef_site"],
    enabled: true,
  },
  {
    label: "Notes",
    href: "/admin/notes",
    icon: NotebookText,
    roles: ["coordonnateur", "comptable", "superviseur", "chef_site"],
    enabled: false,
  },
  {
    label: "Présences",
    href: "/admin/presences",
    icon: ClipboardCheck,
    roles: ["coordonnateur", "comptable", "superviseur", "chef_site"],
    enabled: false,
  },
  {
    label: "Paiements",
    href: "/admin/paiements/enregistrer",
    icon: Wallet,
    roles: ["coordonnateur", "comptable", "superviseur"],
    enabled: true,
  },
  {
    label: "Statistiques",
    href: "/admin/statistiques",
    icon: BarChart3,
    roles: ["coordonnateur", "comptable", "superviseur"],
    enabled: false,
  },
  {
    label: "Programmation TD",
    href: "/admin/td/coord/planning",
    icon: CalendarClock,
    roles: ["coordonnateur"],
    enabled: false,
  },
  {
    label: "Comptabilité",
    href: "/admin/comptabilite",
    icon: Calculator,
    roles: ["coordonnateur", "comptable"],
    enabled: false,
  },
  {
    label: "Fin d'année",
    href: "/admin/fin-annee",
    icon: GraduationCap,
    roles: ["coordonnateur"],
    enabled: false,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    roles: ["coordonnateur", "comptable", "superviseur"],
    enabled: false,
  },
  {
    label: "Galerie",
    href: "/admin/galerie",
    icon: Images,
    roles: ["coordonnateur", "comptable", "superviseur"],
    enabled: false,
  },
  {
    label: "Agent IA",
    href: "/admin/agent-ia",
    icon: Sparkles,
    roles: ["coordonnateur"],
    enabled: false,
  },
  {
    label: "Paramètres",
    href: "/admin/parametres/utilisateurs",
    icon: Settings,
    roles: ["coordonnateur"],
    enabled: false,
  },
];

export function Sidebar() {
  const { role } = useUserScope();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <aside className="w-[280px] shrink-0 bg-white border-r border-gray-100 min-h-screen py-6 px-4 hidden lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-2 mb-5">
        <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain" />
        <span className="font-bold text-gray-900">Admin GSR</span>
      </div>

      {ROLES_INSCRIPTION.includes(role) && (
        <Link
          href="/admin/eleves/inscription"
          className="flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white bg-primary-gradient shadow-sm hover:shadow-md transition-all h-10 mb-5"
        >
          <UserPlus className="w-4 h-4" />
          Nouvelle inscription
        </Link>
      )}

      <nav className="space-y-1 flex-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname.startsWith(item.href.split("/").slice(0, 3).join("/"));
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                title="Bientôt disponible"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 cursor-not-allowed select-none"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        disabled={isPending}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors mt-4 disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </button>
    </aside>
  );
}
