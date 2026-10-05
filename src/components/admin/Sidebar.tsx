"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { UserPlus, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserScope } from "@/hooks/useUserScope";
import { useAdminSidebar } from "@/components/admin/AdminSidebarContext";
import { logout } from "@/actions/auth";
import { NAV_ITEMS, ROLES_INSCRIPTION } from "@/lib/admin-nav";

export function Sidebar() {
  const { role } = useUserScope();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { isOpen: mobileOpen, close: closeSidebar } = useAdminSidebar();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  // Empêche le scroll du contenu derrière le panneau déplié sur mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleLogout() {
    startTransition(async () => {
      await logout();
      router.push("/admin/login");
      router.refresh();
    });
  }

  function renderNav(collapsed: boolean, onNavigate?: () => void) {
    return (
      <nav className={cn("space-y-1 flex-1 overflow-y-auto", collapsed && "flex flex-col items-center")}>
        {items.map((item) => {
          const active = pathname.startsWith(item.href.split("/").slice(0, 3).join("/"));
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                title="Bientôt disponible"
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm text-gray-300 cursor-not-allowed select-none",
                  collapsed ? "justify-center w-10 h-10" : "px-3 py-2.5"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center w-10 h-10" : "px-3 py-2.5",
                active ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  function renderInscriptionCta(collapsed: boolean, onNavigate?: () => void) {
    if (!ROLES_INSCRIPTION.includes(role)) return null;
    return (
      <Link
        href="/admin/eleves/inscription"
        title={collapsed ? "Nouvelle inscription" : undefined}
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white bg-primary-gradient shadow-sm hover:shadow-md transition-all mb-5",
          collapsed ? "w-10 h-10" : "h-10"
        )}
      >
        <UserPlus className="w-4 h-4 shrink-0" />
        {!collapsed && "Nouvelle inscription"}
      </Link>
    );
  }

  function renderLogoutButton(collapsed: boolean) {
    return (
      <button
        onClick={handleLogout}
        disabled={isPending}
        title={collapsed ? "Déconnexion" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors mt-4 disabled:opacity-50",
          collapsed ? "justify-center w-10 h-10" : "px-3 py-2.5"
        )}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        {!collapsed && "Déconnexion"}
      </button>
    );
  }

  return (
    <>
      {/* Sidebar complet desktop, masqué sur mobile */}
      <aside className="w-[280px] shrink-0 bg-white border-r border-gray-100 sticky top-0 h-screen py-6 px-4 hidden lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-2 mb-5">
          <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain" />
          <span className="font-bold text-gray-900">Admin GSR</span>
        </div>

        {renderInscriptionCta(false)}
        {renderNav(false)}
        {renderLogoutButton(false)}
      </aside>

      {/* Panneau déplié en tiroir coulissant au-dessus du contenu, sur mobile uniquement */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeSidebar}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl py-6 px-4 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-2 mb-5">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain" />
                <span className="font-bold text-gray-900">Admin GSR</span>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Fermer le menu"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderInscriptionCta(false, closeSidebar)}
            {renderNav(false, closeSidebar)}
            {renderLogoutButton(false)}
          </aside>
        </div>
      )}
    </>
  );
}
