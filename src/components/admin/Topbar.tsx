"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, HelpCircle, type LucideIcon } from "lucide-react";
import { useUserScope } from "@/hooks/useUserScope";
import { NotificationBadge } from "@/components/admin/NotificationBadge";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";

// Même périmètre que /api/eleves-recherche et la fiche élève /admin/eleves/[id].
const ROLES_RECHERCHE_ELEVES: UserRole[] = ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"];

interface EleveResultat {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

function RechercheElevesTopbar() {
  const router = useRouter();
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<EleveResultat[]>([]);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    function handleClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", handleClicExterieur);
    return () => document.removeEventListener("mousedown", handleClicExterieur);
  }, []);

  function rechercher(q: string) {
    setRequete(q);
    setOuvert(true);
    if (q.trim().length < 2) {
      setResultats([]);
      return;
    }
    fetch(`/api/eleves-recherche?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => setResultats(Array.isArray(data) ? data : []));
  }

  function choisirEleve(id: number) {
    setOuvert(false);
    setRequete("");
    setResultats([]);
    router.push(`/admin/eleves/${id}`);
  }

  return (
    <div ref={conteneurRef} className="relative flex-1 min-w-0 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
      <input
        value={requete}
        onChange={(e) => rechercher(e.target.value)}
        onFocus={() => setOuvert(true)}
        placeholder="Rechercher un élève…"
        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
      />
      {ouvert && requete.trim().length >= 2 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {resultats.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-gray-400">Aucun élève trouvé.</p>
          ) : (
            resultats.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => choisirEleve(e.id)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <span className="font-medium text-gray-800">{e.nom} {e.prenoms}</span>{" "}
                <span className="text-gray-400 font-mono text-xs">{e.matricule}</span>
                <div className="text-xs text-gray-500">
                  {e.classes?.nom_classe ?? "—"} — {e.classes?.sites?.nom_site ?? "—"}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
      className="w-28 sm:w-auto shrink-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
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
      {ROLES_RECHERCHE_ELEVES.includes(role) ? (
        <RechercheElevesTopbar />
      ) : (
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            disabled
            title="Non applicable à votre rôle"
            placeholder="Rechercher un élève…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 cursor-not-allowed placeholder:text-gray-300"
          />
        </div>
      )}

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
        <Link
          href="/admin/aide"
          title="Aide"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>
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
