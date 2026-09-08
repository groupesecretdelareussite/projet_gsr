"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import {
  LayoutDashboard,
  CalendarClock,
  Gavel,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/td/coord/dashboard", icon: LayoutDashboard },
  { label: "Planning", href: "/td/coord/planning", icon: CalendarClock },
  { label: "Arbitrage", href: "/td/coord/arbitrage", icon: Gavel },
  { label: "Finance", href: "/td/coord/finance", icon: Wallet },
  {
    label: "Configuration",
    href: "/td/coord/config/zones",
    icon: Settings,
    matchPrefix: "/td/coord/config",
  },
];

export function TdCoordHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Bloque le défilement de l'arrière-plan quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Fermer avec la touche Échap
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/td/login");
      router.refresh();
    });
  }

  function isItemActive(item: (typeof NAV_ITEMS)[number]) {
    if (item.matchPrefix) {
      return pathname.startsWith(item.matchPrefix);
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Marque & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/td/coord/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg border border-primary/20 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
              <Image src="/logo.png" alt="GSR Logo" width={22} height={22} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 text-sm sm:text-base leading-tight">Portail TD</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                  <ShieldCheck className="w-3 h-3" />
                  Coord
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Desktop (≥ md) */}
        <nav className="hidden md:flex items-center gap-1 min-w-0">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap",
                  active
                    ? "bg-primary/10 text-primary shadow-xs"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions Desktop (≥ md) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link
            href="/admin/aide"
            title="Aide & Documentation"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-gray-500" />
            <span>Aide</span>
          </Link>

          <Link
            href="/admin/tableau-de-bord"
            title="Retourner à l'administration principale GSR"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-500" />
            <span>Admin GSR</span>
          </Link>

          <div className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            title="Se déconnecter"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isPending ? "Déconnexion..." : "Déconnexion"}</span>
          </button>
        </div>

        {/* Bouton Hamburger Mobile (< md) */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tiroir Mobile (Drawer Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Arrière-plan semi-transparent */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Panneau latéral coulissant */}
          <aside className="absolute right-0 top-0 h-full w-[290px] max-w-[85vw] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* En-tête du tiroir */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg border border-primary/20 flex items-center justify-center bg-white shadow-2xs">
                  <Image src="/logo.png" alt="GSR Logo" width={20} height={20} className="object-contain" />
                </div>
                <div>
                  <span className="font-bold text-gray-900 text-sm block leading-tight">Portail TD</span>
                  <span className="text-[11px] font-semibold text-primary">Coordonnateur</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation principale */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Navigation TD
              </p>
              {NAV_ITEMS.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-gray-500")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Raccourcis & Aide
                </p>
                <Link
                  href="/admin/aide"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Aide & Documentation</span>
                </Link>

                <Link
                  href="/admin/tableau-de-bord"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Retour Admin GSR</span>
                </Link>
              </div>
            </div>

            {/* Pied de tiroir — Déconnexion */}
            <div className="p-4 border-t border-gray-100 bg-surface/30">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>{isPending ? "Déconnexion..." : "Se déconnecter"}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
