"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { enregistrerAppelDuJour } from "@/actions/presences";

export interface EleveOption {
  id: number;
  nom: string;
  prenoms: string;
}

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

/**
 * §discussion 2026-08-16 — la coche par carte n'est plus sauvegardée
 * individuellement : tout reste local (état visuel "tout présent" au
 * chargement, on décoche à volonté) jusqu'au clic sur "Sauvegarder", qui
 * envoie l'état exact affiché en un seul upsert multi-lignes puis renvoie
 * vers `/admin/presences` (écran de sélection vide).
 */
export function PresencesCards({
  eleves,
  datePresence,
  siteId,
  classeId,
  anneeScolaireId,
}: {
  eleves: EleveOption[];
  datePresence: string;
  siteId: number;
  classeId: number;
  anneeScolaireId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [presences, setPresences] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(eleves.map((e) => [e.id, true]))
  );

  const nbPresents = eleves.filter((e) => presences[e.id]).length;

  function toggle(eleveId: number) {
    setPresences((prev) => ({ ...prev, [eleveId]: !prev[eleveId] }));
  }

  function marquerTous(present: boolean) {
    setPresences(Object.fromEntries(eleves.map((e) => [e.id, present])));
  }

  function sauvegarder() {
    startTransition(async () => {
      const result = await enregistrerAppelDuJour({
        datePresence,
        siteId,
        classeId,
        anneeScolaireId,
        presences: eleves.map((e) => ({ eleveId: e.id, present: presences[e.id] })),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Appel enregistré");
      router.push("/admin/presences");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <CompteurCirculaire presents={nbPresents} total={eleves.length} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => marquerTous(true)}
            disabled={isPending}
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            Tout présent
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => marquerTous(false)}
            disabled={isPending}
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            Tout absent
          </Button>
          <Button type="button" size="sm" onClick={sauvegarder} disabled={isPending}>
            {isPending ? "Enregistrement..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {eleves.map((eleve) => {
          const present = presences[eleve.id];

          return (
            <button
              key={eleve.id}
              type="button"
              onClick={() => toggle(eleve.id)}
              disabled={isPending}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors disabled:opacity-50",
                present ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
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
