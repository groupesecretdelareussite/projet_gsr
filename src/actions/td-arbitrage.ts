"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";

/**
 * §10.4/§12.6 GSR_ARCHITECTURE.md — Règle A, transaction atomique. La
 * fonction SQL stockée `td.arbitrer_creneau()` vérifie elle-même le rôle via
 * `auth.uid()` (SECURITY DEFINER), donc appelée avec le client RLS — même
 * raisonnement que `valider_fin_annee()` dans fin-annee.ts, jamais avec le
 * client service role qui n'a pas de session utilisateur à vérifier.
 */
export async function traiterArbitrageTD(creneauId: number, professeurId: number): Promise<{ error?: string }> {
  const scope = await getUserScope(createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }

  const supabase = createClient();
  const { error } = await supabase.schema("td").rpc("arbitrer_creneau", {
    p_creneau_id: creneauId,
    p_professeur_id: professeurId,
  });
  if (error) return { error: error.message };

  revalidatePath("/td/coord/arbitrage");
  revalidatePath("/td/coord/planning");
  return {};
}
