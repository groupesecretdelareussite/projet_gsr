"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope } from "@/lib/auth-scope";

/** Pas de policy UPDATE sur `notifications` (lecture seule côté RLS, §5.8) — service role nécessaire, scope revérifié ici. */
export async function marquerNotificationLue(id: number): Promise<{ error?: string }> {
  const scope = await getUserScope(createClient());
  const supabaseAdmin = createServiceRoleClient();

  const { data: notif } = await supabaseAdmin.from("notifications").select("site_id").eq("id", id).maybeSingle();
  if (!notif) return { error: "Notification introuvable" };
  if (!siteInScope(scope, notif.site_id)) return { error: "Non autorisé" };

  const { error } = await supabaseAdmin.from("notifications").update({ lu: true }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function marquerToutesNotificationsLues(ids: number[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  await getUserScope(createClient());
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.from("notifications").update({ lu: true }).in("id", ids);
  if (error) return { error: error.message };
  return {};
}
