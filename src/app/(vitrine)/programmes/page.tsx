"use client";

import { useState } from "react";
import { Calendar, Filter, Download, Lock, ChevronDown } from "lucide-react";

// ─── Données de démonstration ────────────────────────────────────────────────
const SITES = ["Jonquet", "Akpakpa", "Missèbo", "Cadjèhoun"];

const CLASSES = ["6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Tle"];
const CRENEAUX = ["07H - 10H", "10H - 13H", "14H - 17H"];

type Programme = {
  [site: string]: {
    [jour: string]: {
      [classe: string]: { [creneau: string]: string };
    };
  };
};

const PROGRAMMES: Programme = {
  Jonquet: {
    "Mercredi 22 Mai": {
      "6ème":  { "07H - 10H": "FRANÇAIS",      "10H - 13H": "",          "14H - 17H": "MATHS"       },
      "5ème":  { "07H - 10H": "",               "10H - 13H": "PCT",       "14H - 17H": "-"           },
      "4ème":  { "07H - 10H": "MATHS",          "10H - 13H": "",          "14H - 17H": "SVT"         },
      "3ème":  { "07H - 10H": "PCT",            "10H - 13H": "MATHS",     "14H - 17H": "-"           },
      "2nde":  { "07H - 10H": "",               "10H - 13H": "SVT",       "14H - 17H": "PCT"         },
      "1ère":  { "07H - 10H": "MATHS",          "10H - 13H": "-",         "14H - 17H": "PHILOSOPHIE" },
      "Tle":   { "07H - 10H": "PCT",            "10H - 13H": "SVT",       "14H - 17H": "MATHS"       },
    },
    "Samedi 25 Mai": {
      "6ème":  { "07H - 10H": "",               "10H - 13H": "HIST-GEO",  "14H - 17H": ""            },
      "5ème":  { "07H - 10H": "MATHS",          "10H - 13H": "",          "14H - 17H": "ANGLAIS"     },
      "4ème":  { "07H - 10H": "-",              "10H - 13H": "PCT",       "14H - 17H": "-"           },
      "3ème":  { "07H - 10H": "MATHS",          "10H - 13H": "PCT",       "14H - 17H": "FRANÇAIS"    },
      "2nde":  { "07H - 10H": "PCT",            "10H - 13H": "-",         "14H - 17H": "MATHS"       },
      "1ère":  { "07H - 10H": "",               "10H - 13H": "SVT",       "14H - 17H": "MATHS"       },
      "Tle":   { "07H - 10H": "MATHS",          "10H - 13H": "PCT",       "14H - 17H": "SVT"         },
    },
    "Dimanche 26 Mai": {
      "6ème":  { "07H - 10H": "MATHS",          "10H - 13H": "",          "14H - 17H": ""            },
      "5ème":  { "07H - 10H": "-",              "10H - 13H": "FRANÇAIS",  "14H - 17H": "-"           },
      "4ème":  { "07H - 10H": "ANGLAIS",        "10H - 13H": "",          "14H - 17H": "MATHS"       },
      "3ème":  { "07H - 10H": "SVT",            "10H - 13H": "-",         "14H - 17H": "HIST-GEO"    },
      "2nde":  { "07H - 10H": "MATHS",          "10H - 13H": "SVT",       "14H - 17H": ""            },
      "1ère":  { "07H - 10H": "-",              "10H - 13H": "PCT",       "14H - 17H": "MATHS"       },
      "Tle":   { "07H - 10H": "SVT",            "10H - 13H": "MATHS",     "14H - 17H": "PCT"         },
    },
  },
  Akpakpa: {
    "Mercredi 22 Mai": {
      "6ème":  { "07H - 10H": "MATHS",          "10H - 13H": "",          "14H - 17H": "FRANÇAIS"    },
      "5ème":  { "07H - 10H": "SVT",            "10H - 13H": "MATHS",     "14H - 17H": ""            },
      "4ème":  { "07H - 10H": "",               "10H - 13H": "ANGLAIS",   "14H - 17H": "PCT"         },
      "3ème":  { "07H - 10H": "FRANÇAIS",       "10H - 13H": "",          "14H - 17H": "MATHS"       },
      "2nde":  { "07H - 10H": "PHILOSOPHIE",    "10H - 13H": "SVT",       "14H - 17H": ""            },
      "1ère":  { "07H - 10H": "",               "10H - 13H": "MATHS",     "14H - 17H": "SVT"         },
      "Tle":   { "07H - 10H": "ANGLAIS",        "10H - 13H": "",          "14H - 17H": "MATHS"       },
    },
    "Samedi 25 Mai": {
      "6ème":  { "07H - 10H": "SVT",            "10H - 13H": "",          "14H - 17H": "MATHS"       },
      "5ème":  { "07H - 10H": "",               "10H - 13H": "FRANÇAIS",  "14H - 17H": ""            },
      "4ème":  { "07H - 10H": "MATHS",          "10H - 13H": "SVT",       "14H - 17H": "PCT"         },
      "3ème":  { "07H - 10H": "",               "10H - 13H": "MATHS",     "14H - 17H": "HIST-GEO"   },
      "2nde":  { "07H - 10H": "ANGLAIS",        "10H - 13H": "",          "14H - 17H": "MATHS"       },
      "1ère":  { "07H - 10H": "PCT",            "10H - 13H": "MATHS",     "14H - 17H": ""            },
      "Tle":   { "07H - 10H": "",               "10H - 13H": "SVT",       "14H - 17H": "MATHS"       },
    },
    "Dimanche 26 Mai": {
      "6ème":  { "07H - 10H": "",               "10H - 13H": "MATHS",     "14H - 17H": "SVT"         },
      "5ème":  { "07H - 10H": "FRANÇAIS",       "10H - 13H": "",          "14H - 17H": "PCT"         },
      "4ème":  { "07H - 10H": "MATHS",          "10H - 13H": "ANGLAIS",   "14H - 17H": ""            },
      "3ème":  { "07H - 10H": "",               "10H - 13H": "SVT",       "14H - 17H": "MATHS"       },
      "2nde":  { "07H - 10H": "HIST-GEO",       "10H - 13H": "",          "14H - 17H": "PCT"         },
      "1ère":  { "07H - 10H": "MATHS",          "10H - 13H": "SVT",       "14H - 17H": ""            },
      "Tle":   { "07H - 10H": "",               "10H - 13H": "MATHS",     "14H - 17H": "FRANÇAIS"    },
    },
  },
};

// Remplir les sites manquants avec des données vides
["Missèbo", "Cadjèhoun"].forEach((site) => {
  PROGRAMMES[site] = {
    "Mercredi 22 Mai": {},
    "Samedi 25 Mai": {},
    "Dimanche 26 Mai": {},
  };
  ["Mercredi 22 Mai", "Samedi 25 Mai", "Dimanche 26 Mai"].forEach((jour) => {
    CLASSES.forEach((cls) => {
      PROGRAMMES[site][jour][cls] = {
        "07H - 10H": "-",
        "10H - 13H": "-",
        "14H - 17H": "-",
      };
    });
  });
});

// ─── Composant TableauJour ────────────────────────────────────────────────────
function TableauJour({
  jour,
  data,
}: {
  jour: string;
  data: { [classe: string]: { [creneau: string]: string } };
}) {
  const hasData = CLASSES.some((cls) =>
    CRENEAUX.some((cr) => data[cls]?.[cr] && data[cls][cr] !== "-" && data[cls][cr] !== "")
  );

  return (
    <div className="mb-8">
      {/* En-tête du jour */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary/10 rounded-lg p-2 text-primary">
          <Calendar className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">{jour}</h2>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600 w-20">Classe</th>
              {CRENEAUX.map((cr) => (
                <th key={cr} className="px-4 py-3 text-center font-semibold text-gray-600">
                  {cr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((cls, i) => (
              <tr
                key={cls}
                className={`border-b border-gray-100 last:border-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                <td className="px-4 py-3 font-semibold text-gray-700">{cls}</td>
                {CRENEAUX.map((cr) => {
                  const val = data[cls]?.[cr] ?? "";
                  const isEmpty = val === "" || val === "-";
                  return (
                    <td key={cr} className="px-4 py-3 text-center">
                      {isEmpty ? (
                        <span className="text-gray-300 select-none">—</span>
                      ) : (
                        <span className="font-bold text-primary tracking-wide text-xs sm:text-sm">
                          {val}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!hasData && (
          <div className="py-8 text-center text-gray-400 text-sm">
            Aucun programme disponible pour ce jour.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProgrammesPage() {
  const [selectedSite, setSelectedSite] = useState("Jonquet");
  const [appliedSite, setAppliedSite] = useState("Jonquet");
  const [isOpen, setIsOpen] = useState(false);

  const jours = Object.keys(PROGRAMMES[appliedSite] ?? {});

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
            Planification hebdomadaire par site et par classe
          </p>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Filtre Site ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Choisir le site
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Custom select */}
            <div className="relative min-w-[200px]">
              <button
                className="w-full flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span>{selectedSite}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                  {SITES.map((site) => (
                    <button
                      key={site}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors ${
                        selectedSite === site ? "text-primary font-semibold bg-primary/5" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setSelectedSite(site);
                        setIsOpen(false);
                      }}
                    >
                      {site}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bouton Appliquer */}
            <button
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
              onClick={() => setAppliedSite(selectedSite)}
            >
              <Filter className="w-4 h-4" />
              Appliquer
            </button>
          </div>
        </div>

        {/* ── Tableaux par jour ── */}
        {jours.map((jour) => (
          <TableauJour
            key={jour}
            jour={jour}
            data={PROGRAMMES[appliedSite]?.[jour] ?? {}}
          />
        ))}

        {/* ── CTA Téléchargement ── */}
        <div className="mt-12 border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-white px-6 py-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-600 uppercase tracking-widest bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                Réservé au personnel
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Télécharger l'emploi du temps complet
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              Obtenez le calendrier hebdomadaire détaillé au format pdf
            </p>
            <button
              className="inline-flex items-center gap-3 bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-primary-dark transition-colors shadow-md"
              onClick={() => alert("Connexion requise — Espace Staff")}
            >
              <Download className="w-5 h-5" />
              Télécharger le planning ({appliedSite}) PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
