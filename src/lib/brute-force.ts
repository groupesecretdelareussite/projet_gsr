import type { createServiceRoleClient } from "@/lib/supabase/admin";

const MAX_TENTATIVES = 5;
const FENETRE_MINUTES = 15;

export type Portail = "admin" | "parent" | "td";

/** §5.6 GSR_ARCHITECTURE.md — garde-fou anti brute-force partagé par les 3 portails de connexion (admin/parent/td), 5 échecs / 15 min par identifiant+portail. */
export async function tropDeTentatives(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  portail: Portail
): Promise<boolean> {
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifiant", identifiant)
    .eq("portail", portail)
    .eq("reussi", false)
    .gte("date_tentative", depuis);

  return (count ?? 0) >= MAX_TENTATIVES;
}

export async function enregistrerTentative(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  portail: Portail,
  reussi: boolean
): Promise<void> {
  await supabaseAdmin.from("login_attempts").insert({ identifiant, portail, reussi });
}
