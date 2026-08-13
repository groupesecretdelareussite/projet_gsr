import * as XLSX from "xlsx";

/**
 * Titre descriptif écrit en ligne 1 de la feuille (ligne 2 laissée vide),
 * avant les en-têtes/données à partir de la ligne 3 — pour qu'un fichier
 * ouvert sans contexte dise déjà ce qu'il contient.
 */
export function exporterExcel(titre: string, lignes: Record<string, string | number>[], nomFichier: string, nomFeuille = "Export"): void {
  const feuille = XLSX.utils.aoa_to_sheet([[titre]]);
  XLSX.utils.sheet_add_json(feuille, lignes, { origin: "A3" });
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, nomFeuille);
  XLSX.writeFile(classeur, `${nomFichier}.xlsx`);
}
