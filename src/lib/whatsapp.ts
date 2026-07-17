/**
 * §1.3/§13 GSR_ARCHITECTURE.md — jamais d'envoi automatique : on ne fait que
 * générer le lien wa.me, l'utilisateur clique et envoie lui-même.
 */
export function genererLienWhatsApp(contactParent: string, message: string): string {
  const numero = contactParent.replace(/[^0-9]/g, "");
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}
