"use client";

import type { UserRole } from "@/lib/constants";
import { Sparkles } from "lucide-react";

interface PromptSuggestionsProps {
  role: UserRole;
  onSelect: (prompt: string) => void;
}

const SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  coordonnateur: [
    "Fais-moi un point global sur le recouvrement des frais TD ce mois-ci.",
    "Combien d'élèves sont actuellement suspendus et pour quels motifs ?",
    "Quels sont les créneaux TD de la semaine prochaine qui n'ont pas encore de professeur ?",
    "Quel est le solde comptable net actuel du groupe ?",
    "Quels sont les élèves ayant cumulé plus de 2 absences récemment ?",
  ],
  comptable: [
    "Quel est le bilan financier global (recettes vs dépenses) ?",
    "Donne-moi la liste des 10 plus gros retards de paiement avec les contacts.",
    "Quelle est la répartition des dépenses annexes par catégorie ?",
    "Quel est le taux de recouvrement pour le mois d'Octobre et de Novembre ?",
  ],
  superviseur: [
    "Quels élèves ont accumulé des absences répétées sur mes sites assignés ?",
    "Quel est le taux de paiement actuel des classes de mon site ?",
    "Quels sont les élèves en difficulté académique (moyenne < 10) ?",
    "Recherche les élèves actuellement suspendus sur mon périmètre.",
  ],
};

export function PromptSuggestions({ role, onSelect }: PromptSuggestionsProps) {
  const suggestions = SUGGESTIONS_BY_ROLE[role] || SUGGESTIONS_BY_ROLE.superviseur;

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        <span>Suggestions rapides :</span>
      </div>
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(s)}
            className="text-left text-xs bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900 border border-emerald-200/80 rounded-full px-3 py-1.5 transition-colors cursor-pointer shadow-2xs hover:shadow-xs shrink-0"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
