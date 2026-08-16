"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exporterExcel } from "@/lib/export-excel";

interface ExporterExcelButtonProps {
  titre: string;
  lignes: Record<string, string | number>[];
  nomFichier: string;
  nomFeuille?: string;
  /** Personnalise le texte du bouton — utile quand plusieurs exports cohabitent (ex. "Présents"/"Absents"). */
  label?: string;
}

export function ExporterExcelButton({ titre, lignes, nomFichier, nomFeuille, label = "Exporter" }: ExporterExcelButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={() => exporterExcel(titre, lignes, nomFichier, nomFeuille)}>
      <FileSpreadsheet className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}
