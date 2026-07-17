import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/constants";

export interface UserScope {
  userId: string;
  username: string;
  role: UserRole;
  siteId: number | null; // chef_site uniquement
  siteIds: number[]; // superviseur uniquement
  isGlobal: boolean;
}

/**
 * §5.4 GSR_ARCHITECTURE.md — chaque Server Action sensible commence par cet
 * appel avant toute lecture/écriture.
 */
export async function getUserScope(supabase: SupabaseClient): Promise<UserScope> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("users")
    .select("username, role, site_id, actif")
    .eq("id", user.id)
    .single();

  if (!profile?.actif) throw new Error("Compte désactivé");

  let siteIds: number[] = [];

  if (profile.role === "superviseur") {
    const { data: sites } = await supabase
      .from("user_sites")
      .select("site_id")
      .eq("user_id", user.id);
    siteIds = sites?.map((s) => s.site_id) ?? [];
  } else if (profile.role === "chef_site" && profile.site_id) {
    siteIds = [profile.site_id];
  }

  return {
    userId: user.id,
    username: profile.username,
    role: profile.role as UserRole,
    siteId: profile.site_id ?? null,
    siteIds,
    isGlobal: ["coordonnateur", "comptable"].includes(profile.role),
  };
}

/** Un site donné est-il dans le périmètre autorisé de ce scope ? */
export function siteInScope(scope: UserScope, siteId: number): boolean {
  return scope.isGlobal || scope.siteIds.includes(siteId) || scope.siteId === siteId;
}
