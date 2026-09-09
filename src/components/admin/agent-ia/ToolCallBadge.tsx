"use client";

import { Loader2, CheckCircle2, Database } from "lucide-react";

export interface ToolCallItem {
  name: string;
  args?: Record<string, any>;
  status: "running" | "done" | "error";
  summary?: string;
}

const TOOL_LABELS: Record<string, string> = {
  rechercher_eleves: "Recherche d'élèves",
  get_fiche_eleve: "Consultation de dossier élève",
  get_etat_paiements_et_recouvrement: "Analyse des paiements & retards",
  get_bilan_comptable: "Calcul du bilan comptable",
  get_synthese_presences: "Vérification des présences",
  get_performances_pedagogiques: "Analyse des notes & moyennes",
  get_planning_td: "Consultation du planning TD",
  get_regles_metier_gsr: "Vérification des règles GSR",
};

export function ToolCallBadge({ tool }: { tool: ToolCallItem }) {
  const label = TOOL_LABELS[tool.name] || tool.name;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 my-1">
      <Database className="w-3 h-3 text-emerald-600 shrink-0" />
      <span>{label}</span>
      {tool.status === "running" ? (
        <Loader2 className="w-3 h-3 animate-spin text-emerald-600 ml-1 shrink-0" />
      ) : (
        <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1 shrink-0" />
      )}
    </div>
  );
}
