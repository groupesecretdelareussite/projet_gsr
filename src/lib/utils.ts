import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bouton(s) d'action d'une ligne de DataTable : masqués jusqu'au survol de la
 * ligne sur un appareil à souris réelle (`@media (hover: hover)`, pas juste
 * un breakpoint d'écran — une tablette tactile large passerait le test
 * `md:` mais n'a pas de survol) ; toujours visibles sur écran tactile.
 * Nécessite la classe `group` sur le <tr> parent (déjà posée dans DataTable.tsx).
 */
export const ACTIONS_HOVER_REVEAL =
  "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 transition-opacity";

/** Libellé texte d'un bouton d'action : icône seule sur écran tactile, texte visible uniquement là où ACTIONS_HOVER_REVEAL s'applique. */
export const HOVER_ONLY_LABEL = "hidden [@media(hover:hover)]:inline";
