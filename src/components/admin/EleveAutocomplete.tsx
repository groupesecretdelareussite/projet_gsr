"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface EleveResultat {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

interface EleveAutocompleteProps {
  eleve: EleveResultat | null;
  onChange: (eleve: EleveResultat | null) => void;
  placeholder?: string;
}

/** Recherche par nom/matricule via `/api/eleves-recherche` — RLS scope déjà appliqué côté route. */
export function EleveAutocomplete({ eleve, onChange, placeholder = "Rechercher par nom ou matricule…" }: EleveAutocompleteProps) {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<EleveResultat[]>([]);

  function rechercher(q: string) {
    setRecherche(q);
    if (q.trim().length < 2) {
      setResultats([]);
      return;
    }
    fetch(`/api/eleves-recherche?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => setResultats(Array.isArray(data) ? data : []));
  }

  function choisir(e: EleveResultat) {
    setRecherche("");
    setResultats([]);
    onChange(e);
  }

  if (eleve) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-sm">
          <span className="font-medium">
            {eleve.nom} {eleve.prenoms}
          </span>{" "}
          <span className="text-gray-400 font-mono text-xs">{eleve.matricule}</span>
          <div className="text-xs text-gray-500">
            {eleve.classes?.nom_classe} — {eleve.classes?.sites?.nom_site}
          </div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input value={recherche} onChange={(e) => rechercher(e.target.value)} placeholder={placeholder} className="pl-9" />
      {resultats.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-56 overflow-auto">
          {resultats.map((r) => (
            <button key={r.id} type="button" onClick={() => choisir(r)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
              <span className="font-medium">
                {r.nom} {r.prenoms}
              </span>{" "}
              <span className="text-gray-400 font-mono text-xs">{r.matricule}</span>
              <div className="text-xs text-gray-500">
                {r.classes?.nom_classe} — {r.classes?.sites?.nom_site}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
