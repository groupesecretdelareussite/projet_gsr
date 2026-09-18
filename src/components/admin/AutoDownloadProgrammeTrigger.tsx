"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function AutoDownloadProgrammeTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasTriggered = useRef(false);

  useEffect(() => {
    const shouldDownload = searchParams.get("download_programme") === "1";
    if (shouldDownload && !hasTriggered.current) {
      hasTriggered.current = true;

      // Déclenchement automatique du téléchargement
      const link = document.createElement("a");
      link.href = "/api/td/programme-pdf";
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Téléchargement du programme hebdomadaire lancé.");

      // Nettoyage immédiat de l'URL pour ne pas redéclencher au refresh
      router.replace("/admin/tableau-de-bord");
    }
  }, [searchParams, router]);

  return null;
}
