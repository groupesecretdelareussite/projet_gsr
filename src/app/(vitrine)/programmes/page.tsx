import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Calendar, FileDown, GraduationCap, LogIn, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  regrouperEtTrierCreneauxParClasse,
  type ClasseMetadata,
} from "@/lib/programmes-tri";

export const metadata: Metadata = {
  title: "Nos programmes — Cours intensifs, TD et préparation examens | GSR",
  description:
    "Découvrez nos cours intensifs, notre programme d'accompagnement scolaire (TD) et notre préparation ciblée au BEPC et au BAC.",
  alternates: { canonical: "/programmes" },
  openGraph: {
    title: "Nos programmes — Cours intensifs, TD et préparation examens | GSR",
    description:
      "Cours intensifs, accompagnement scolaire (TD) et préparation ciblée au BEPC et au BAC.",
    url: "/programmes",
  },
};

interface CreneauPublic {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
}

/**
 * Semaine(s) TD publiée(s) par le coordonnateur, lues via le client RLS
 * normal (policies "lecture_publique", sql/017_programmes_publics_rls.sql) —
 * jamais le service role sur une page publique non authentifiée. Toutes les
 * semaines publiees sont affichées (pas seulement "la" semaine courante) :
 * rien n'empêche d'en publier plusieurs à l'avance.
 */
export default async function ProgrammesPage(props: { searchParams: Promise<{ site?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const { data: semaines } = await supabase
    .schema("td")
    .from("semaines")
    .select("id")
    .eq("statut", "publiee")
    .order("date_debut");
  const semaineIds = (semaines ?? []).map((s) => s.id);

  let creneaux: CreneauPublic[] = [];
  if (semaineIds.length > 0) {
    const { data } = await supabase
      .schema("td")
      .from("creneaux")
      .select("id, classe_id, matiere_id, date_td, heure_debut, heure_fin")
      .in("semaine_id", semaineIds)
      .in("statut_creneau", ["public", "cloture"])
      .order("date_td")
      .order("heure_debut");
    creneaux = (data ?? []) as CreneauPublic[];
  }

  const [{ data: sites }, { data: classes }, { data: matieres }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id, ordre"),
    supabase.schema("td").from("matieres_td").select("id, nom_matiere"),
  ]);

  const listeSites = sites ?? [];
  const listeClasses = (classes ?? []) as ClasseMetadata[];
  const classesMap = new Map(listeClasses.map((c) => [c.id, c]));
  const siteIdParClasseId = new Map(listeClasses.map((c) => [c.id, c.site_id]));
  const nomSiteParId = new Map(listeSites.map((s) => [s.id, s.nom_site]));
  const nomMatiereParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));

  const siteFiltre = searchParams.site ? Number(searchParams.site) : null;
  const creneauxFiltres = siteFiltre
    ? creneaux.filter((c) => siteIdParClasseId.get(c.classe_id) === siteFiltre)
    : creneaux;

  const parJour = new Map<string, CreneauPublic[]>();
  for (const c of creneauxFiltres) {
    parJour.set(c.date_td, [...(parJour.get(c.date_td) ?? []), c]);
  }
  const jours = Array.from(parJour.keys()).sort();

  // ── Détection d'un membre du personnel staff connecté ──
  const { data: authData } = await supabase.auth.getUser();
  let staffProfile: { username: string; role: string; site_id: number | null } | null = null;
  if (authData.user) {
    const { data: userRow } = await supabase
      .from("users")
      .select("username, role, site_id")
      .eq("id", authData.user.id)
      .eq("actif", true)
      .maybeSingle();
    staffProfile = userRow;
  }
  const isStaff =
    staffProfile !== null && ["chef_site", "coordonnateur", "superviseur"].includes(staffProfile.role);
  const staffNomSite = staffProfile?.site_id ? nomSiteParId.get(staffProfile.site_id) : null;
  const staffRoleLabel =
    staffProfile?.role === "chef_site"
      ? "Chef de site"
      : staffProfile?.role === "coordonnateur"
      ? "Coordonnateur"
      : staffProfile?.role === "superviseur"
      ? "Superviseur"
      : "Membre du personnel";

  return (
    <div>
      {/* ── Page Header ── */}
      <div
        className="px-6 py-12 md:py-16"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
            Nos Programmes de TD
          </h1>
          <p className="text-white text-sm sm:text-base">
            Le planning hebdomadaire réel, publié par nos coordonnateurs
          </p>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Filtre Site ── */}
        {listeSites.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Filtrer par site
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/programmes"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                  !siteFiltre
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 text-gray-600 hover:border-primary/50"
                )}
              >
                Tous les sites
              </Link>
              {listeSites.map((s) => (
                <Link
                  key={s.id}
                  href={`/programmes?site=${s.id}`}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                    siteFiltre === s.id
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 text-gray-600 hover:border-primary/50"
                  )}
                >
                  {s.nom_site}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Programme, par jour ── */}
        {jours.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm py-16 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Aucun programme publié pour le moment — revenez bientôt.
            </p>
          </div>
        ) : (
          jours.map((jour) => {
            const creneauxJour = parJour.get(jour) ?? [];
            const groupesClasses = regrouperEtTrierCreneauxParClasse(creneauxJour, classesMap);

            return (
              <div key={jour} className="mb-10">
                {/* ── En-tête du jour ── */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 rounded-xl p-2.5 text-primary shadow-xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 capitalize">
                      {new Date(`${jour}T00:00:00`).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {groupesClasses.length} classe{groupesClasses.length > 1 ? "s" : ""} · {creneauxJour.length} séance{creneauxJour.length > 1 ? "s" : ""} au total
                    </p>
                  </div>
                </div>

                {/* ── Regroupement visuel par niveau / classe ── */}
                <div className="space-y-4">
                  {groupesClasses.map((groupe) => (
                    <div
                      key={groupe.classeId}
                      className="bg-white border border-gray-200 rounded-xl shadow-xs p-4 sm:p-5 hover:border-primary/40 transition-colors"
                    >
                      {/* En-tête de la classe */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">
                              {groupe.nomClasse}
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {nomSiteParId.get(groupe.siteId) ?? "—"}
                            </p>
                          </div>
                        </div>
                        <span className="self-start sm:self-center text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                          {groupe.creneaux.length} séance{groupe.creneaux.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Liste des séances pour cette classe */}
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {groupe.creneaux.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-2.5 bg-gray-50/80 hover:bg-gray-50 rounded-lg px-3.5 py-2.5 border border-gray-200/70 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <BookOpen className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-semibold text-sm text-gray-800 truncate">
                                {nomMatiereParId.get(c.matiere_id) ?? "—"}
                              </span>
                            </div>
                            <span className="font-bold text-primary text-xs sm:text-sm tracking-wide bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-2xs shrink-0">
                              {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* ── Section Réservée au Personnel Staff ── */}
        <div className="mt-14 pt-8 border-t border-gray-200">
          <div className="bg-gradient-to-br from-[#05330f] via-[#084514] to-[#0a5c10] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <ShieldCheck className="w-48 h-48 text-white/5 absolute -right-12 -bottom-12 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  Espace Réservé au Personnel Staff
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Programme Officiel &amp; Attribution des Professeurs
                </h3>
                {isStaff ? (
                  <p className="text-white/80 text-sm leading-relaxed">
                    Connecté en tant que <strong className="text-white">{staffProfile?.username}</strong> (
                    {staffRoleLabel}
                    {staffNomSite ? ` — Site ${staffNomSite}` : ""}). Vous pouvez télécharger la
                    feuille de route hebdomadaire complète au format paysage avec les coordonnées
                    directes des professeurs pour chaque séance.
                  </p>
                ) : (
                  <p className="text-white/80 text-sm leading-relaxed">
                    Vous êtes Chef de site ou membre de l&apos;équipe GSR ? Connectez-vous avec vos
                    identifiants pour télécharger la feuille de route hebdomadaire complète (PDF
                    paysage) avec la liste des professeurs attribués à chaque créneau.
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {isStaff ? (
                  <a
                    href="/api/td/programme-pdf"
                    download
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-[#05330f] hover:bg-emerald-50 font-bold text-sm shadow-sm transition-all"
                  >
                    <FileDown className="w-4 h-4 text-[#05330f]" />
                    <span>Télécharger le Programme (PDF)</span>
                  </a>
                ) : (
                  <Link
                    href="/admin/login?redirect=/admin/tableau-de-bord?download_programme=1"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Connexion Staff &amp; Téléchargement</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-white/60 flex flex-wrap items-center justify-between gap-2">
              <span>Document administratif confidentiel réservé à l&apos;encadrement GSR.</span>
              <span>Format Paysage (A4) · Tableau par jour · Scoping sécurisé par site</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
