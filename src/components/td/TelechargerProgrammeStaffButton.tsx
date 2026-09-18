"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TelechargerProgrammeStaffButton({ siteId }: { siteId?: number | null }) {
  const [chargement, setChargement] = useState(false);

  async function telecharger() {
    if (chargement) return;
    setChargement(true);
    try {
      const url = siteId ? `/api/td/programme-pdf?site=${siteId}` : "/api/td/programme-pdf";
      const res = await fetch(url);

      if (!res.ok) {
        const errorMsg = await res.text();
        toast.error(errorMsg || "Impossible de générer le programme.");
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

      toast.success("Programme hebdomadaire téléchargé.");
    } catch (err) {
      console.error("Erreur téléchargement programme :", err);
      toast.error("Erreur réseau lors du téléchargement.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <button
      type="button"
      onClick={telecharger}
      disabled={chargement}
      className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-[#05330f] hover:bg-emerald-50 font-bold text-sm shadow-sm transition-all disabled:opacity-70 cursor-pointer"
    >
      {chargement ? (
        <>
          <Loader2 className="w-4 h-4 text-[#05330f] animate-spin" />
          <span>Génération du PDF...</span>
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4 text-[#05330f]" />
          <span>Télécharger le Programme (PDF)</span>
        </>
      )}
    </button>
  );
}
