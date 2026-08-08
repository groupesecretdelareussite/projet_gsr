/**
 * §5.6 GSR_ARCHITECTURE.md — backstop serveur du timeout d'inactivité (20
 * min) pour les sessions Supabase Auth (admin + coordonnateur sur
 * /td/coord, qui réutilise la même session). Distinct des cookies
 * iron-session des portails parents/TD professeur : ce cookie ne porte
 * aucune donnée, sa seule présence signale une activité récente.
 * Rafraîchi par prolongerSessionAdmin() (cf. AdminInactivityWatcher), lu
 * par proxy.ts sur chaque requête admin/td-coord.
 */
export const ADMIN_ACTIVITY_COOKIE = "gsr_admin_activite";

export const ADMIN_ACTIVITY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1200, // 20 min
  path: "/",
};
