"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5 text-primary shadow-xs">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
        Une interruption inattendue est survenue
      </h1>
      <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
        La page demandée a rencontré une difficulté momentanée.
        Vous pouvez retenter le chargement ou retourner sur la page d&apos;accueil.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </Button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold h-10 px-4 text-sm border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-all"
        >
          <Home className="w-4 h-4" />
          Accueil
        </Link>
      </div>
    </div>
  );
}
