"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TdError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[TdError]", error);
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
        Le portail TD a rencontré une difficulté momentanée lors du traitement de votre demande.
        Vous pouvez réessayer l&apos;action ou revenir à la page d&apos;accueil du portail.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Réessayer
        </Button>
        <Link
          href="/td/login"
          className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold h-10 px-4 text-sm border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Portail TD
        </Link>
      </div>
    </div>
  );
}
