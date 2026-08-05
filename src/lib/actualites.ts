export type Categorie = "Vie scolaire" | "Événement" | "Réussite" | "Cours" | "Examens/Contrôle";

export interface Article {
  id: number;
  title: string;
  category: Categorie;
  /** Toutes les photos de l'article, dans l'ordre — images[0] sert de couverture sur /actualites, toutes défilent dans la modal de lecture. */
  images: string[];
  date: string;
  description: string;
  contenu: string[];
}

export const CATEGORY_STYLES: Record<Categorie, string> = {
  "Vie scolaire": "bg-red-50 text-red-700 border-red-200",
  Événement: "bg-green-50 text-green-700 border-green-200",
  Réussite: "bg-blue-50 text-blue-700 border-blue-200",
  Cours: "bg-violet-50 text-violet-700 border-violet-200",
  "Examens/Contrôle": "bg-amber-50 text-amber-700 border-amber-200",
};
