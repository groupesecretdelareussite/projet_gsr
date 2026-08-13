"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { exporterExcel } from "@/lib/export-excel";

interface ExporterExcelButtonProps {
  titre: string;
  lignes: Record<string, string | number>[];
  nomFichier: string;
  nomFeuille?: string;
}

export function ExporterExcelButton({ titre, lignes, nomFichier, nomFeuille }: ExporterExcelButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={() => exporterExcel(titre, lignes, nomFichier, nomFeuille)}>
      <FileSpreadsheet className="w-3.5 h-3.5" />
      <span className={HOVER_ONLY_LABEL}>Exporter</span>
    </Button>
  );
}
