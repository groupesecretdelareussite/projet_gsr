import { cookies } from "next/headers";

export const COOKIE_FILTRE_SITE_SUPERVISEUR = "superviseur_site_filter";

/**
 * §8.1 GSR_ARCHITECTURE.md — toggle "Tous mes sites / [site]" du
 * superviseur dans la topbar. N'impacte jamais RLS (déjà scopé par
 * `user_sites`) : sert uniquement de valeur par défaut pour le filtre
 * `site_id` de chaque page quand aucun `?site_id=` explicite n'est fourni.
 */
export async function lireFiltreSiteSuperviseur(): Promise<number | undefined> {
  const cookieStore = await cookies();
  const valeur = cookieStore.get(COOKIE_FILTRE_SITE_SUPERVISEUR)?.value;
  return valeur ? Number(valeur) : undefined;
}
