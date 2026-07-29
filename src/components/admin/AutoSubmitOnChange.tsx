"use client";

import { useEffect, useRef } from "react";

/**
 * À placer dans un `<form method="get">` contenant des `<select>`/`<input>`
 * de filtre : soumet le formulaire dès qu'un champ change, sans bouton à
 * cliquer. Un `<select>` ne déclenche jamais de soumission de formulaire de
 * lui-même en HTML — sans ce composant, changer un filtre ne fait rien tant
 * qu'on ne clique pas sur un bouton "Filtrer" (bug réel trouvé sur
 * Notes/Présences/Statistiques/Élèves/Paiements > Historique : le bouton
 * existait mais était caché, donc injoignable).
 */
export function AutoSubmitOnChange() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const handleChange = () => form.requestSubmit();
    form.addEventListener("change", handleChange);
    return () => form.removeEventListener("change", handleChange);
  }, []);

  return <span ref={ref} className="hidden" />;
}
