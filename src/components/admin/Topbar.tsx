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

/** Recherche élève — version grand écran (Desktop / Tablette large) */
function RechercheElevesDesktop() {
  const router = useRouter();
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<EleveResultat[]>([]);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    function handleClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
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
    <div ref={conteneurRef} className="hidden md:block relative flex-1 min-w-0 max-w-sm">
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

/** Recherche élève — version mobile (icône loupe + panneau déroulant identique aux notifications) */
function RechercheElevesMobile() {
  const router = useRouter();
  const conteneurRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<EleveResultat[]>([]);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    function handleClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    if (ouvert) {
      document.addEventListener("mousedown", handleClicExterieur);
      // Autofocus lors de l'ouverture
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        document.removeEventListener("mousedown", handleClicExterieur);
        clearTimeout(timer);
      };
    }
  }, [ouvert]);

  function rechercher(q: string) {
    setRequete(q);
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
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        title="Rechercher un élève"
        aria-label="Rechercher un élève"
      >
        <Search className="w-4 h-4" />
      </button>

      {ouvert && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                value={requete}
                onChange={(e) => rechercher(e.target.value)}
                placeholder="Rechercher par nom ou matricule…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {requete.trim().length < 2 ? (
              <p className="px-4 py-6 text-xs text-gray-400 text-center">
                Tapez au moins 2 caractères pour lancer la recherche…
              </p>
            ) : resultats.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                Aucun élève trouvé pour &laquo;&nbsp;{requete}&nbsp;&raquo;.
              </p>
            ) : (
              resultats.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => choisirEleve(e.id)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">{e.nom} {e.prenoms}</span>
                    <span className="text-gray-400 font-mono text-xs shrink-0">{e.matricule}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {e.classes?.nom_classe ?? "—"} · {e.classes?.sites?.nom_site ?? "—"}
                  </div>
                </button>
              ))
            )}
          </div>
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
 * Sélecteur de site actif pour le superviseur dans le topbar (§5.4).
 * Sauvegarde le choix dans un cookie non-HttpOnly pour que le Server Component
 * (dashboard, listes...) puisse le lire dès la première passe de rendu SSR.
 */
function ToggleSiteSuperviseur({ sites }: { sites: { id: number; nom_site: string }[] }) {
  const [valeur, setValeur] = useState<string>(() => {
    if (typeof document === "undefined") return "";
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_FILTRE_SITE_SUPERVISEUR}=`));
    return match ? (match.split("=")[1] ?? "") : "";
  });

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setValeur(val);
    if (val) {
      document.cookie = `${COOKIE_FILTRE_SITE_SUPERVISEUR}=${val}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `${COOKIE_FILTRE_SITE_SUPERVISEUR}=; path=/; max-age=0; SameSite=Lax`;
    }
    window.location.reload();
  }

  if (sites.length <= 1) return null;

  return (
    <select
      aria-label="Filtrer par site"
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
  const peutRechercher = ROLES_RECHERCHE_ELEVES.includes(role);

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-4 sm:px-6 gap-2 sm:gap-4">
      {peutRechercher ? (
        <RechercheElevesDesktop />
      ) : (
        <div className="hidden md:block relative flex-1 min-w-0 max-w-sm">
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
        {/* Recherche Mobile (icône loupe + volet déroulant) */}
        {peutRechercher && (
          <div className="md:hidden">
            <RechercheElevesMobile />
          </div>
        )}

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
        className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-100 hover:opacity-80 transition-opacity shrink-0"
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
