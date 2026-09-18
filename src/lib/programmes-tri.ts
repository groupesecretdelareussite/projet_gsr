/**
 * Logique de tri et de regroupement des créneaux TD par classe.
 * Critères stricts :
 * 1. Ordre du niveau scolaire croissant (6ème → Terminale).
 * 2. Nom de la classe alphabétique (ex: Terminale A avant Terminale D).
 */

export interface ClasseMetadata {
  id: number;
  nom_classe: string;
  site_id: number;
  ordre?: number | null;
}

export interface CreneauDeBase {
  id: number;
  classe_id: number;
  matiere_id: number;
  date_td: string;
  heure_debut: string;
  heure_fin: string;
}

export interface GroupeClasse<T extends CreneauDeBase = CreneauDeBase> {
  classeId: number;
  nomClasse: string;
  siteId: number;
  ordreNiveau: number;
  creneaux: T[];
}

/**
 * Détermine le rang hiérarchique d'une classe (1: 6ème -> 7: Terminale).
 * Utilise la valeur en base (ordre) si présente et positive, sinon déduit à partir du nom.
 */
export function getOrdreNiveau(nomClasse: string, ordreDb?: number | null): number {
  if (typeof ordreDb === "number" && ordreDb > 0) {
    return ordreDb;
  }
  const nom = (nomClasse || "").toLowerCase().trim();
  if (/6\s*(è|e|eme|ème)|sixième/i.test(nom)) return 1;
  if (/5\s*(è|e|eme|ème)|cinquième/i.test(nom)) return 2;
  if (/4\s*(è|e|eme|ème)|quatrième/i.test(nom)) return 3;
  if (/3\s*(è|e|eme|ème)|troisième/i.test(nom)) return 4;
  if (/sec|2\s*(nd|de|nde)|seconde/i.test(nom)) return 5;
  if (/prem|1\s*(èr|er|re|ère)|première/i.test(nom)) return 6;
  if (/term|tle|terminale/i.test(nom)) return 7;
  return 99;
}

/**
 * Fonction de comparaison entre deux classes selon :
 * - Critère 1 : Ordre de niveau (6ème → Terminale)
 * - Critère 2 : Nom de la classe (ex: Terminale A avant Terminale D)
 */
export function comparerClasses(
  a: { nom: string; ordre: number },
  b: { nom: string; ordre: number }
): number {
  // Critère 1 : Ordre scolaire croissant
  if (a.ordre !== b.ordre) {
    return a.ordre - b.ordre;
  }
  // Critère 2 : Nom alphabétique de la classe
  return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base", numeric: true });
}

/**
 * Regroupe et trie les créneaux d'une journée par classe selon les critères 1 et 2.
 */
export function regrouperEtTrierCreneauxParClasse<T extends CreneauDeBase>(
  creneaux: T[],
  classesMap: Map<number, ClasseMetadata>
): GroupeClasse<T>[] {
  const mapGroupes = new Map<number, T[]>();

  for (const c of creneaux) {
    const existants = mapGroupes.get(c.classe_id) ?? [];
    existants.push(c);
    mapGroupes.set(c.classe_id, existants);
  }

  const groupes: GroupeClasse<T>[] = [];

  for (const [classeId, creneauxClasse] of mapGroupes.entries()) {
    const meta = classesMap.get(classeId);
    const nomClasse = meta?.nom_classe ?? `Classe #${classeId}`;
    const siteId = meta?.site_id ?? 0;
    const ordreNiveau = getOrdreNiveau(nomClasse, meta?.ordre);

    // Au sein de la même classe, on ordonne ses cours par horaire pour la lisibilité
    const creneauxTries = [...creneauxClasse].sort((a, b) =>
      a.heure_debut.localeCompare(b.heure_debut)
    );

    groupes.push({
      classeId,
      nomClasse,
      siteId,
      ordreNiveau,
      creneaux: creneauxTries,
    });
  }

  // Tri des groupes de classes selon les deux critères
  groupes.sort((gA, gB) =>
    comparerClasses(
      { nom: gA.nomClasse, ordre: gA.ordreNiveau },
      { nom: gB.nomClasse, ordre: gB.ordreNiveau }
    )
  );

  return groupes;
}
