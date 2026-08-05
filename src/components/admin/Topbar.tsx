"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, HelpCircle, type LucideIcon } from "lucide-react";
import { useUserScope } from "@/hooks/useUserScope";
import { NotificationBadge } from "@/components/admin/NotificationBadge";
import { ROLE_LABELS } from "@/lib/constants";

// Dupliqué depuis lib/site-filter-cookie.ts (server-only, importe next/headers) —
// un composant client ne peut pas importer ce module même pour la seule constante.
const COOKIE_FILTRE_SITE_SUPERVISEUR = "superviseur_site_filter";

/** Bouton d'icône sans fonctionnalité construite pour l'instant — même convention que le Sidebar (`enabled: false`). */
function IconPlaceholder({ icon: Icon }: { icon: LucideIcon }) {
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

/**
 * §8.1 GSR_ARCHITECTURE.md — "Tous mes sites" / "[Nom du site]". N'impacte
 * pas RLS (déjà scopé) : sert de valeur par défaut au filtre `site_id` de
 * chaque page tant qu'aucun `?site_id=` explicite n'est choisi sur cette page.
 */
function ToggleSiteSuperviseur({ sites }: { sites: { id: number; nom_site: string }[] }) {
  const router = useRouter();
  const [valeur, setValeur] = useState("");

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_FILTRE_SITE_SUPERVISEUR}=([^;]*)`));
    // document.cookie n'existe pas côté serveur — lu uniquement après montage pour éviter un mismatch d'hydratation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValeur(match ? decodeURIComponent(match[1]) : "");
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setValeur(v);
    document.cookie = v
      ? `${COOKIE_FILTRE_SITE_SUPERVISEUR}=${v}; path=/; max-age=${60 * 60 * 24 * 30}`
      : `${COOKIE_FILTRE_SITE_SUPERVISEUR}=; path=/; max-age=0`;
    router.refresh();
  }

  if (sites.length === 0) return null;

  return (
    <select
      value={valeur}
      onChange={handleChange}
      className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
    >
      <option value="">Tous mes sites</option>
      {sites.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nom_site}
        </option>
      ))}
    </select>
  );
}

export function Topbar({ sitesSuperviseur = [] }: { sitesSuperviseur?: { id: number; nom_site: string }[] }) {
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

      {role === "superviseur" && <ToggleSiteSuperviseur sites={sitesSuperviseur} />}

      <div className="flex items-center gap-1">
        <NotificationBadge />
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

      <Link
        href="/admin/mon-compte"
        title="Mon compte"
        className="flex items-center gap-3 pl-3 border-l border-gray-100 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-full bg-primary-gradient flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-semibold text-gray-800">{nomAffiche}</p>
          <p className="text-xs text-gray-500">{ROLE_LABELS[role]}</p>
        </div>
      </Link>
    </header>
  );
}
