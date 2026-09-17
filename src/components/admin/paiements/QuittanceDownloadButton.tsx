"use client";

import { useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuittancePDF, type QuittanceData } from "@/components/admin/paiements/QuittancePDF";

/** Bouton de téléchargement immédiat après validation dans le formulaire. */
export function QuittanceDownloadButton({ data }: { data: QuittanceData }) {
  return (
    <PDFDownloadLink document={<QuittancePDF data={data} />} fileName={`Quittance_${data.matricule}_${data.mois}.pdf`}>
      <Button type="button" variant="outline" size="sm">
        <FileDown className="w-3.5 h-3.5" />
        Télécharger la quittance
      </Button>
    </PDFDownloadLink>
  );
}

/** Bouton de téléchargement à la demande pour chaque ligne du tableau des élèves à jour. */
export function TelechargerQuittanceButton({ data }: { data: QuittanceData }) {
  const [chargement, setChargement] = useState(false);

  async function telecharger() {
    if (chargement) return;
    setChargement(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<QuittancePDF data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quittance_${data.matricule}_${data.mois}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur lors de la génération de la quittance :", err);
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
