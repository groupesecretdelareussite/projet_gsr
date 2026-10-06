"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EleveAutocomplete, type EleveResultat } from "@/components/admin/EleveAutocomplete";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

/**
 * La sélection d'élève se fait par clic (pas un `<select>` natif), donc pas
 * de "change" natif pour `AutoSubmitOnChange` — on navigue nous-mêmes dès que
 * les deux filtres (élève + mois) sont renseignés.
 */
export function HistoriqueEleveFiltre({
  eleveInitial,
  moisInitial,
}: {
  eleveInitial: EleveResultat | null;
  moisInitial?: MoisScolaire;
}) {
  const router = useRouter();
  const [eleve, setEleve] = useState(eleveInitial);
  const [mois, setMois] = useState<MoisScolaire | "">(moisInitial ?? "");

  function naviguer(nextEleve: EleveResultat | null, nextMois: MoisScolaire | "") {
    if (!nextEleve || !nextMois) return;
    router.push(`/admin/presences/historique/eleve?eleve_id=${nextEleve.id}&mois=${nextMois}`);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 max-w-2xl items-start">
      <div className="sm:col-span-2">
        <EleveAutocomplete
          eleve={eleve}
          onChange={(e) => {
            setEleve(e);
            naviguer(e, mois);
          }}
        />
      </div>
      <select
        value={mois}
        onChange={(e) => {
          const m = e.target.value as MoisScolaire;
          setMois(m);
          naviguer(eleve, m);
        }}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
      >
        <option value="">Choisir le mois</option>
        {MOIS_SCOLAIRES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
