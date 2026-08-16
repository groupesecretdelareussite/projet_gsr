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
    <div className="grid sm:grid-cols-3 gap-3 mb-6 max-w-2xl items-start">
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
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
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
