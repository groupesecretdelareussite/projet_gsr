"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journalise l'erreur en console côté développeur sans exposer de détails sensibles à l'écran
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5 text-amber-600 shadow-xs">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        Une interruption inattendue est survenue
      </h1>
      <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
        Le chargement de cette section a rencontré une difficulté temporaire.
        Vos données restent en sécurité. Vous pouvez réessayer ou revenir au tableau de bord.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </Button>
        <Link
          href="/admin/tableau-de-bord"
          className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold h-10 px-4 text-sm border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-all"
        >
          <LayoutDashboard className="w-4 h-4" />
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
