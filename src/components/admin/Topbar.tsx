"use client";

import Link from "next/link";
import { Search, Bell, Settings, HelpCircle } from "lucide-react";
import { useUserScope } from "@/hooks/useUserScope";
import { ROLE_LABELS } from "@/lib/constants";

/** Bouton d'icône sans fonctionnalité construite pour l'instant — même convention que le Sidebar (`enabled: false`). */
function IconPlaceholder({ icon: Icon }: { icon: typeof Bell }) {
  return (
    <button
      type="button"
      disabled
      title="Bientôt disponible"
      className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 cursor-not-allowed"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export function Topbar() {
  const { role, username } = useUserScope();
  const nomAffiche = username.charAt(0).toUpperCase() + username.slice(1);

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          disabled
          title="Bientôt disponible"
          placeholder="Rechercher un élève…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 cursor-not-allowed placeholder:text-gray-300"
        />
      </div>

      <div className="flex items-center gap-1">
        <IconPlaceholder icon={Bell} />
        {role === "coordonnateur" ? (
          <Link
            href="/admin/parametres/utilisateurs"
            title="Paramètres"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Link>
        ) : (
          <IconPlaceholder icon={Settings} />
        )}
        <IconPlaceholder icon={HelpCircle} />
      </div>

      <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
        <div className="w-9 h-9 rounded-full bg-primary-gradient flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-semibold text-gray-800">{nomAffiche}</p>
          <p className="text-xs text-gray-500">{ROLE_LABELS[role]}</p>
        </div>
      </div>
    </header>
  );
}
