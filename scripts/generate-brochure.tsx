import path from "path";
import React from "react";
import { renderToFile } from "@react-pdf/renderer";
import { BrochurePDF } from "../src/components/vitrine/BrochurePDF";

/**
 * One-shot — génère public/brochure-gsr.pdf. Le contenu ne dépend d'aucune
 * donnée dynamique (pas de connexion Supabase), donc pas besoin de le
 * regénérer à la volée à chaque téléchargement : à relancer manuellement
 * après une modification du contenu (tarifs, sites, textes).
 */
async function main() {
  const destination = path.join(process.cwd(), "public/brochure-gsr.pdf");
  await renderToFile(<BrochurePDF annee={new Date().getFullYear()} />, destination);
  console.log(`Brochure générée : ${destination}`);
}

main();
