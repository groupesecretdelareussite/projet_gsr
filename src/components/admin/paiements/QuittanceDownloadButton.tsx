"use client";

import { useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QuittancePDF, type QuittanceData } from "@/components/admin/paiements/QuittancePDF";

/** Télécharge de manière universelle et fiable un document PDF de quittance. */
async function telechargerDocumentQuittance(data: QuittanceData) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<QuittancePDF data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Quittance_${data.matricule}_${data.mois}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Révocation différée pour laisser le temps au navigateur d'initialiser le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Bouton de téléchargement immédiat après validation dans le formulaire. */
export function QuittanceDownloadButton({ data }: { data: QuittanceData }) {
  const [chargement, setChargement] = useState(false);

  async function telecharger() {
    if (chargement) return;
    setChargement(true);
    try {
      await telechargerDocumentQuittance(data);
      toast.success("Quittance téléchargée avec succès.");
    } catch (err) {
      console.error("Erreur lors de la génération de la quittance :", err);
      toast.error("Impossible de générer la quittance PDF.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={telecharger}
      disabled={chargement}
      className="gap-2"
    >
      {chargement ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Génération...</span>
        </>
      ) : (
        <>
          <FileDown className="w-3.5 h-3.5" />
          <span>Télécharger la quittance</span>
        </>
      )}
    </Button>
  );
}

/** Bouton de téléchargement à la demande pour chaque ligne du tableau des élèves à jour. */
export function TelechargerQuittanceButton({ data }: { data: QuittanceData }) {
  const [chargement, setChargement] = useState(false);

  async function telecharger() {
    if (chargement) return;
    setChargement(true);
    try {
      await telechargerDocumentQuittance(data);
    } catch (err) {
      console.error("Erreur lors de la génération de la quittance :", err);
      toast.error("Impossible de générer la quittance PDF.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={telecharger}
      disabled={chargement}
      className="gap-1 text-xs text-primary border-primary/30 hover:bg-primary/5 hover:border-primary"
      title="Télécharger la quittance PDF"
    >
      {chargement ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Génération...</span>
        </>
      ) : (
        <>
          <FileText className="w-3.5 h-3.5" />
          <span>Quittance</span>
        </>
      )}
    </Button>
  );
}
