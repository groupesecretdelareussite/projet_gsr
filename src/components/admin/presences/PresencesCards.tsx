"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { upsertPresence, marquerTousPresence } from "@/actions/presences";

export interface EleveOption {
  id: number;
  nom: string;
  prenoms: string;
}

export interface PresenceExistante {
  eleve_id: number;
  present: boolean;
}

type CarteStatut = "idle" | "saving" | "error";

function CompteurCirculaire({ presents, total }: { presents: number; total: number }) {
  const rayon = 30;
  const circonference = 2 * Math.PI * rayon;
  const pourcentage = total > 0 ? presents / total : 0;
  const offset = circonference * (1 - pourcentage);

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={rayon} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={rayon}
          fill="none"
          stroke="#12AA00"
          strokeWidth="8"
          strokeDasharray={circonference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-gray-800">
          {presents}/{total}
        </span>
      </div>
    </div>
  );
}

export function PresencesCards({
  eleves,
  presencesExistantes,
  datePresence,
  siteId,
  classeId,
  anneeScolaireId,
}: {
  eleves: EleveOption[];
  presencesExistantes: PresenceExistante[];
  datePresence: string;
  siteId: number;
  classeId: number;
  anneeScolaireId: number;
}) {
  const [isPending, startTransition] = useTransition();

  // Élève non encore marqué aujourd'hui -> présent par défaut (cas le plus courant, on décoche les absents).
  const [presences, setPresences] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    for (const e of eleves) map[e.id] = true;
    for (const p of presencesExistantes) map[p.eleve_id] = p.present;
    return map;
  });
  const [statuts, setStatuts] = useState<Record<number, CarteStatut>>({});

  const nbPresents = eleves.filter((e) => presences[e.id]).length;

  function toggle(eleveId: number) {
    const nouvelleValeur = !presences[eleveId];
    setPresences((prev) => ({ ...prev, [eleveId]: nouvelleValeur }));
    setStatuts((prev) => ({ ...prev, [eleveId]: "saving" }));

    startTransition(async () => {
      const result = await upsertPresence({
        eleveId,
        datePresence,
        siteId,
        classeId,
        anneeScolaireId,
        present: nouvelleValeur,
      });
      if (result.error) {
        setStatuts((prev) => ({ ...prev, [eleveId]: "error" }));
        toast.error(result.error);
        return;
      }
      setStatuts((prev) => ({ ...prev, [eleveId]: "idle" }));
    });
  }

  function marquerTous(present: boolean) {
    const eleveIds = eleves.map((e) => e.id);
    setPresences(Object.fromEntries(eleveIds.map((id) => [id, present])));
    setStatuts(Object.fromEntries(eleveIds.map((id) => [id, "saving"])));

    startTransition(async () => {
      const result = await marquerTousPresence({ eleveIds, datePresence, siteId, classeId, anneeScolaireId, present });
      if (result.error) {
        setStatuts(Object.fromEntries(eleveIds.map((id) => [id, "error"])));
        toast.error(result.error);
        return;
      }
      setStatuts(Object.fromEntries(eleveIds.map((id) => [id, "idle"])));
      toast.success(present ? "Tous marqués présents" : "Tous marqués absents");
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <CompteurCirculaire presents={nbPresents} total={eleves.length} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => marquerTous(true)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            Tout présent
          </button>
          <button
            type="button"
            onClick={() => marquerTous(false)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Tout absent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {eleves.map((eleve) => {
          const present = presences[eleve.id];
          const statut = statuts[eleve.id] ?? "idle";

          return (
            <button
              key={eleve.id}
              type="button"
              onClick={() => toggle(eleve.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors",
                present ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50",
                statut === "error" && "ring-2 ring-red-400"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white",
                  present ? "bg-green-500" : "bg-red-400"
                )}
              >
                {present ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <span className="text-sm text-gray-700 truncate">
                {eleve.nom} {eleve.prenoms}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
