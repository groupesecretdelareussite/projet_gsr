import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
    supabase.from("classes").select("id, nom_classe, site_id"),
    supabase.schema("td").from("matieres_td").select("id, nom_matiere"),
  ]);

  const listeSites = sites ?? [];
  const siteIdParClasseId = new Map((classes ?? []).map((c) => [c.id, c.site_id]));
  const nomSiteParId = new Map(listeSites.map((s) => [s.id, s.nom_site]));
  const nomClasseParId = new Map((classes ?? []).map((c) => [c.id, c.nom_classe]));
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
          jours.map((jour) => (
            <div key={jour} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 rounded-lg p-2 text-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 capitalize">
                  {new Date(`${jour}T00:00:00`).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
              </div>
              <div className="space-y-2">
                {parJour.get(jour)!.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {nomClasseParId.get(c.classe_id) ?? "—"} — {nomMatiereParId.get(c.matiere_id) ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {nomSiteParId.get(siteIdParClasseId.get(c.classe_id) ?? -1) ?? "—"}
                      </p>
                    </div>
                    <span className="font-bold text-primary text-sm tracking-wide">
                      {c.heure_debut.slice(0, 5)}–{c.heure_fin.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
