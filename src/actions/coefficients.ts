"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

/** Réservé au coordonnateur — même convention que donnees-scolaires.ts. */
async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateCoefficientsPath() {
  revalidatePath("/admin/parametres/coefficients");
  revalidatePath("/admin/notes/moyennes");
}

/**
 * Upsert : absence de ligne = "non configuré" (garde-fou dans Notes >
 * Moyennes), donc créer/modifier passent par la même opération. Le
 * coefficient doit être > 0 — contrainte SQL en filet, vérifiée ici aussi
 * pour un message clair.
 */
export async function definirCoefficient(classeId: number, matiereId: number, coefficient: number): Promise<{ error?: string }> {
  await getScopeAndAssert();

  if (!(coefficient > 0)) {
    return { error: "Le coefficient doit être supérieur à 0" };
  }

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin
    .from("coefficients")
    .upsert({ classe_id: classeId, matiere_id: matiereId, coefficient, updated_at: new Date().toISOString() }, { onConflict: "classe_id,matiere_id" });
  if (error) return { error: error.message };

  revalidateCoefficientsPath();
  return {};
}

/** Retour explicite à l'état "non configuré" plutôt qu'à une valeur arbitraire. */
export async function supprimerCoefficient(classeId: number, matiereId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from("coefficients").delete().eq("classe_id", classeId).eq("matiere_id", matiereId);
  if (error) return { error: error.message };

  revalidateCoefficientsPath();
  return {};
}
