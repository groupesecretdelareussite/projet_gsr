"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface JaugeMotDePasseProps {
  motDePasse: string;
}

export function JaugeMotDePasse({ motDePasse }: JaugeMotDePasseProps) {
  const { score, label, color, criteria } = useMemo(() => {
    const aLongueurMin = motDePasse.length >= 8;
    const aMinuscule = /[a-z]/.test(motDePasse);
    const aMajuscule = /[A-Z]/.test(motDePasse);
    const aChiffre = /[0-9]/.test(motDePasse);
    const aSpecial = /[^a-zA-Z0-9]/.test(motDePasse);

    const criteria = [
      { label: "Au moins 8 caractères", met: aLongueurMin },
      { label: "Au moins une lettre majuscule et une minuscule", met: aMinuscule && aMajuscule },
      { label: "Au moins un chiffre", met: aChiffre },
      { label: "Au moins un symbole (ex: @, #, $, !)", met: aSpecial },
    ];

    if (!motDePasse) {
      return { score: 0, label: "", color: "", criteria };
    }

    if (!aLongueurMin) {
      return {
        score: 1,
        label: "Faible",
        color: "text-red-500",
        criteria,
      };
    }

    let extraPoints = 0;
    if (aMinuscule && aMajuscule) extraPoints++;
    if (aChiffre) extraPoints++;
    if (aSpecial) extraPoints++;
    if (motDePasse.length >= 10) extraPoints++;

    if (extraPoints >= 3) {
      return {
        score: 3,
        label: "Fort",
        color: "text-emerald-600",
        criteria,
      };
    }

    if (extraPoints >= 1) {
      return {
        score: 2,
        label: "Moyen",
        color: "text-amber-500",
        criteria,
      };
    }

    return {
      score: 1,
      label: "Faible",
      color: "text-red-500",
      criteria,
    };
  }, [motDePasse]);

  if (!motDePasse) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">Robustesse :</span>
        <span className={cn("font-semibold", color)}>{label}</span>
      </div>

      {/* 3 segments de progression */}
      <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
        <div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            score >= 1
              ? score === 1
                ? "bg-red-500"
                : score === 2
                ? "bg-amber-400"
                : "bg-emerald-500"
              : "bg-gray-100"
          )}
        />
        <div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            score >= 2
              ? score === 2
                ? "bg-amber-400"
                : "bg-emerald-500"
              : "bg-gray-100"
          )}
        />
        <div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            score >= 3 ? "bg-emerald-500" : "bg-gray-100"
          )}
        />
      </div>

      {/* Critères sous forme de micro-checklist */}
      <ul className="text-[11px] space-y-1 text-gray-500 pt-1">
        {criteria.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.met ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-gray-300 shrink-0" />
            )}
            <span className={c.met ? "text-gray-700" : "text-gray-400"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
