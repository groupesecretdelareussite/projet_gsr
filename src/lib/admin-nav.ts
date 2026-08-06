import type { LucideIcon } from "lucide-react";
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
  Newspaper,
  Settings,
  CalendarClock,
} from "lucide-react";
import type { UserRole } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  enabled: boolean; // false = fonctionnalité pas encore construite (milestone à venir)
}

export const ROLES_INSCRIPTION: UserRole[] = ["coordonnateur", "comptable", "superviseur"];

/**
 * Source unique de vérité pour « qui voit quoi » dans le portail Admin —
 * utilisé par la Sidebar (navigation) ET par la page Aide (`/admin/aide`,
 * §aide) pour que le contenu affiché à un rôle ne s'écarte jamais de ce
 * qu'il peut réellement faire.
 */
export const NAV_ITEMS: NavItem[] = [
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
    enabled: true,
  },
  {
    label: "Présences",
    href: "/admin/presences",
    icon: ClipboardCheck,
    roles: ["coordonnateur", "comptable", "superviseur", "chef_site"],
    enabled: true,
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
    enabled: true,
  },
  {
    label: "Portail TD",
    href: "/td/coord/dashboard",
    icon: CalendarClock,
    roles: ["coordonnateur"],
    enabled: true,
  },
  {
    label: "Comptabilité",
    href: "/admin/comptabilite",
    icon: Calculator,
    roles: ["coordonnateur", "comptable"],
    enabled: true,
  },
  {
    label: "Fin d'année",
    href: "/admin/fin-annee",
    icon: GraduationCap,
    roles: ["coordonnateur"],
    enabled: true,
  },
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    roles: ["coordonnateur", "comptable", "superviseur"],
    enabled: true,
  },
  {
    label: "Galerie",
    href: "/admin/galerie",
    icon: Images,
    roles: ["coordonnateur", "comptable", "superviseur"],
    enabled: true,
  },
  {
    label: "Actualités",
    href: "/admin/actualites",
    icon: Newspaper,
    roles: ["coordonnateur"],
    enabled: true,
  },
  {
    label: "Paramètres",
    href: "/admin/parametres/utilisateurs",
    icon: Settings,
    roles: ["coordonnateur"],
    enabled: true,
  },
];
