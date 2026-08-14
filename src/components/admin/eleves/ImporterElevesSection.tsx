"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { importerEleves, type LigneIgnoree } from "@/actions/eleves";
import { ENTETES_MODELE_IMPORT } from "@/lib/import-eleves";

const CHAMP_FICHIER =
  "block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary-dark hover:file:bg-primary/20";

function telechargerModele() {
  const feuille = XLSX.utils.aoa_to_sheet([ENTETES_MODELE_IMPORT as unknown as string[]]);
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Élèves");
  XLSX.writeFile(classeur, "Modele_import_eleves.xlsx");
}

const COLONNES_IGNORES: DataTableColumn<LigneIgnoree>[] = [
  { key: "ligne", label: "Ligne", render: (l) => l.ligne },
  { key: "nom", label: "Nom", render: (l) => l.nom || "—" },
  { key: "prenoms", label: "Prénoms", render: (l) => l.prenoms || "—" },
  { key: "raison", label: "Raison", render: (l) => <span className="text-red-600">{l.raison}</span> },
];

export function ImporterElevesSection() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [resultat, setResultat] = useState<{ inseres: number; ignores: LigneIgnoree[] } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await importerEleves(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setResultat({ inseres: result.inseres ?? 0, ignores: result.ignores ?? [] });
      toast.success(`${result.inseres ?? 0} élève(s) importé(s)`);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Import en masse</h2>
      <p className="text-sm text-gray-500 mb-4">
        Téléchargez le modèle, remplissez-le, puis importez-le. Les lignes invalides ou en doublon sont ignorées et listées
        ci-dessous — rien n&apos;est importé partiellement pour une ligne en erreur.
      </p>

      <Button type="button" variant="outline" size="sm" onClick={telechargerModele} className="mb-4">
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Télécharger le modèle
      </Button>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input type="file" name="fichier" accept=".xlsx" required className={CHAMP_FICHIER} />
        <Button type="submit" disabled={isPending} className="shrink-0">
          <Upload className="w-4 h-4" />
          {isPending ? "Import en cours..." : "Importer"}
        </Button>
      </form>

      {resultat && (
        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {resultat.inseres} élève(s) importé(s), {resultat.ignores.length} ligne(s) ignorée(s).
          </p>
          {resultat.ignores.length > 0 && (
            <DataTable columns={COLONNES_IGNORES} rows={resultat.ignores} rowKey={(l) => l.ligne} />
          )}
        </div>
      )}
    </div>
  );
}
