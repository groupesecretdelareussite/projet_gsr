"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuittancePDF, type QuittanceData } from "@/components/admin/paiements/QuittancePDF";

/** Isolé dans son propre fichier pour être chargé via next/dynamic (ssr: false) — @react-pdf/renderer est lourd (~480 kB). */
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
