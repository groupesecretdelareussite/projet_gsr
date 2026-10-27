import type { createServiceRoleClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

const MAX_TENTATIVES = 5;
const MAX_TENTATIVES_COMPTE_GLOBAL = 8;
const MAX_TENTATIVES_IP_GLOBAL = 25;
const FENETRE_MINUTES = 15;

export type Portail = "admin" | "parent" | "td";

/**
 * Extrait l'adresse IP du client depuis les en-têtes HTTP (Server Actions ou Route Handlers).
 */
export async function extraireIpClient(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return h.get("x-real-ip")?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * §5.6 GSR_ARCHITECTURE.md — garde-fou anti brute-force partagé par les 3 portails de connexion (admin/parent/td).
 * Protège contre le déni de service de verrouillage (Lockout DoS) en combinant :
 * 1. Un contrôle ciblé par couple (identifiant, IP) à 5 tentatives.
 * 2. Un contrôle global anti-brute force distribué sur le compte à 8 tentatives (multi-IP / botnets).
 * 3. Un contrôle anti-spraying par IP globale à 25 tentatives.
 */
export async function tropDeTentatives(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  portail: Portail,
  ip?: string | null
): Promise<boolean> {
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();

  // 1. Contrôle par couple (identifiant + IP) si IP renseignée
  if (ip) {
    const { count: ipIdentifiantCount } = await supabaseAdmin
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("identifiant", identifiant)
      .eq("portail", portail)
      .eq("reussi", false)
      .eq("ip", ip)
      .gte("date_tentative", depuis);

    if ((ipIdentifiantCount ?? 0) >= MAX_TENTATIVES) {
      return true;
    }
  }

  // 2. Contrôle global anti-brute force sur le compte (toutes IP confondues)
  // Détecte les attaques distribuées (VPN, proxies rotatifs, IPv6)
  const { count: globalIdentifiantCount } = await supabaseAdmin
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifiant", identifiant)
    .eq("portail", portail)
    .eq("reussi", false)
    .gte("date_tentative", depuis);

  const seuilGlobal = ip ? MAX_TENTATIVES_COMPTE_GLOBAL : MAX_TENTATIVES;
  if ((globalIdentifiantCount ?? 0) >= seuilGlobal) {
    return true;
  }

  // 3. Contrôle global anti-spraying par IP (multi-comptes testés depuis une même IP)
  if (ip) {
    const { count: ipCount } = await supabaseAdmin
      .from("login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("reussi", false)
      .gte("date_tentative", depuis);

    if ((ipCount ?? 0) >= MAX_TENTATIVES_IP_GLOBAL) {
      return true;
    }
  }

  return false;
}

export async function enregistrerTentative(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  portail: Portail,
  reussi: boolean,
  ip?: string | null
): Promise<void> {
  const payload: { identifiant: string; portail: Portail; reussi: boolean; ip?: string } = {
    identifiant,
    portail,
    reussi,
  };
  if (ip) {
    payload.ip = ip;
  }
  await supabaseAdmin.from("login_attempts").insert(payload);
}
