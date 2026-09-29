import type { createServiceRoleClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

const MAX_TENTATIVES = 5;
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
 * Protège contre le déni de service de verrouillage (Lockout DoS) en ciblant le couple (identifiant, IP)
 * tout en limitant les scans multi-comptes par IP (anti-password spraying).
 */
export async function tropDeTentatives(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  portail: Portail,
  ip?: string | null
): Promise<boolean> {
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();

  // 1. Contrôle par identifiant (+ IP si connue pour éviter qu'un tiers ne bloque le vrai utilisateur)
  let identifiantQuery = supabaseAdmin
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifiant", identifiant)
    .eq("portail", portail)
    .eq("reussi", false)
    .gte("date_tentative", depuis);

  if (ip) {
    identifiantQuery = identifiantQuery.eq("ip", ip);
  }

  const { count } = await identifiantQuery;
  if ((count ?? 0) >= MAX_TENTATIVES) {
    return true;
  }

  // 2. Contrôle global anti-spraying par IP
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
