"use client";

import { useState } from "react";

interface SiteCarte {
  nom: string;
  requete: string;
}

/**
 * Requêtes résolues à partir des liens Google Maps fournis par l'utilisateur
 * (maps.app.goo.gl) — Jéricho via le nom exact du lieu Google, Yagbé via son
 * Plus Code, Vèdoko via ses coordonnées GPS exactes (les 3 identifiants les
 * plus précis disponibles selon ce que chaque lien exposait). Embed public
 * Google Maps (`output=embed`), pas de clé API.
 */
const SITES_CARTE: SiteCarte[] = [
  { nom: "Jéricho", requete: "École Primaire Public Jericho, Cotonou, Bénin" },
  { nom: "Yagbé", requete: "9FCC+MFV EPP Yagbé, Cotonou" },
  { nom: "Vèdoko", requete: "6.3811179,2.3890623" },
];

export function CarteSites() {
  const [actif, setActif] = useState(0);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex gap-2 p-3 bg-gray-50 border-b border-gray-200">
        {SITES_CARTE.map((site, i) => (
          <button
            key={site.nom}
            type="button"
            onClick={() => setActif(i)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              actif === i
                ? "bg-primary text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-primary/40"
            }`}
          >
            {site.nom}
          </button>
        ))}
      </div>
      <iframe
        key={SITES_CARTE[actif].requete}
        title={`Carte — Site ${SITES_CARTE[actif].nom}`}
        src={`https://www.google.com/maps?q=${encodeURIComponent(SITES_CARTE[actif].requete)}&output=embed`}
        className="w-full h-72 border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
