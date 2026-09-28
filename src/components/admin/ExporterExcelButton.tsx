"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exporterExcel } from "@/lib/export-excel";

interface ExporterExcelButtonProps {
  titre: string;
  lignes?: Record<string, string | number>[];
  onExport?: () => Promise<Record<string, string | number>[]>;
  nomFichier: string;
  nomFeuille?: string;
  /** Personnalise le texte du bouton — utile quand plusieurs exports cohabitent (ex. "Présents"/"Absents"). */
  label?: string;
}

export function ExporterExcelButton({
  titre,
  lignes,
  onExport,
  nomFichier,
  nomFeuille,
  label = "Exporter",
}: ExporterExcelButtonProps) {
  const [enCours, setEnCours] = useState(false);

  const handleExport = async () => {
    if (enCours) return;
    try {
      let data = lignes;
      if (onExport) {
        setEnCours(true);
        data = await onExport();
      }
      if (data && data.length > 0) {
        exporterExcel(titre, data, nomFichier, nomFeuille);
      }
    } catch (err) {
      console.error("Erreur lors de l'export Excel:", err);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={enCours}>
      {enCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
      {enCours ? "Export en cours..." : label}
    </Button>
  );
}
