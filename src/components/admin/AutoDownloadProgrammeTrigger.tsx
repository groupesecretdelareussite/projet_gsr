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

      // Nettoyage immédiat de l'URL pour éviter de redéclencher au refresh
      router.replace("/admin/tableau-de-bord");

      // Téléchargement sécurisé via fetch
      (async () => {
        try {
          const res = await fetch("/api/td/programme-pdf");
          if (!res.ok) {
            const errorMsg = await res.text();
            toast.error(errorMsg || "Impossible de télécharger le programme.");
            return;
          }

          const disposition = res.headers.get("Content-Disposition");
          let filename = "Programme_TD.pdf";
          if (disposition && disposition.includes("filename=")) {
            const matches = disposition.match(/filename="?([^"]+)"?/);
            if (matches && matches[1]) filename = matches[1];
          }

          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);

          toast.success("Programme hebdomadaire téléchargé avec succès.");
        } catch (err) {
          console.error("Erreur auto download :", err);
          toast.error("Erreur lors du téléchargement automatique du programme.");
        }
      })();
    }
  }, [searchParams, router]);

  return null;
}
