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
  const scope = await getUserScope(await createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }

  const supabase = await createClient();
  const { error } = await supabase.schema("td").rpc("arbitrer_creneau", {
    p_creneau_id: creneauId,
    p_professeur_id: professeurId,
  });
  if (error) return { error: error.message };

  revalidatePath("/td/coord/arbitrage");
  revalidatePath("/td/coord/planning");
  return {};
}

/**
 * Affectation directe d'un professeur par le coordonnateur sur un créneau public.
 * Valide directement le professeur choisi (qu'il ait postulé ou non),
 * refuse automatiquement les autres candidats en attente du créneau,
 * applique la Règle A pour les chevauchements, et clôture le créneau.
 */
export async function affecterDirectementProfesseurTD(creneauId: number, professeurId: number): Promise<{ error?: string }> {
  const scope = await getUserScope(await createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }

  const supabase = await createClient();
  const { error } = await supabase.schema("td").rpc("affecter_directement_creneau", {
    p_creneau_id: creneauId,
    p_professeur_id: professeurId,
  });
  if (error) return { error: error.message };

  revalidatePath("/td/coord/arbitrage");
  revalidatePath("/td/coord/planning");
  return {};
}

