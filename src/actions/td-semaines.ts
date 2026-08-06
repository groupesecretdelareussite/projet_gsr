"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(await createClient());
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidatePlanning() {
  revalidatePath("/td/coord/planning");
}

/** §10.3/§12.8 — dateDebut doit être un mercredi ; dateFin (dimanche) est calculée automatiquement, jamais saisie. */
export interface CreerSemaineInput {
  libelle: string;
  dateDebut: string; // ISO yyyy-mm-dd, mercredi
}

export async function creerSemaineTD(input: CreerSemaineInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  const debut = new Date(`${input.dateDebut}T00:00:00`);
  if (debut.getDay() !== 3) {
    return { error: "La date de début doit être un mercredi" };
  }
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 4); // mercredi + 4 jours = dimanche

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .insert({
      libelle: input.libelle,
      date_debut: input.dateDebut,
      date_fin: fin.toISOString().slice(0, 10),
    });
  if (error) return { error: error.message };

  revalidatePlanning();
  return {};
}

/** §12.8 — publier exige ≥1 créneau, fait passer brouillon -> publiee et tous ses créneaux brouillon -> public. */
export async function publierSemaineTD(semaineId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { count } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("id", { count: "exact", head: true })
    .eq("semaine_id", semaineId);
  if ((count ?? 0) === 0) {
    return { error: "Impossible de publier une semaine sans créneau." };
  }

  const { error: erreurCreneaux } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .update({ statut_creneau: "public" })
    .eq("semaine_id", semaineId)
    .eq("statut_creneau", "brouillon");
  if (erreurCreneaux) return { error: erreurCreneaux.message };

  const { error } = await supabaseAdmin.schema("td").from("semaines").update({ statut: "publiee" }).eq("id", semaineId);
  if (error) return { error: error.message };

  revalidatePlanning();
  return {};
}

/**
 * §12.8 — irréversible : tous les créneaux encore `public` (jamais pourvus)
 * passent `cloture`, et leurs candidatures encore `En attente` sont
 * refusées. Les créneaux déjà `cloture` via l'arbitrage (§12.6) sont
 * inchangés.
 */
export async function cloturerSemaineTD(semaineId: number): Promise<{ error?: string }> {
  await getScopeAndAssert();
  const supabaseAdmin = createServiceRoleClient();

  const { data: creneauxPublics } = await supabaseAdmin
    .schema("td")
    .from("creneaux")
    .select("id")
    .eq("semaine_id", semaineId)
    .eq("statut_creneau", "public");

  const idsCreneauxPublics = (creneauxPublics ?? []).map((c) => c.id);

  if (idsCreneauxPublics.length > 0) {
    const { error: erreurPostulations } = await supabaseAdmin
      .schema("td")
      .from("postulations")
      .update({ statut_validation: "Refuse" })
      .in("creneau_id", idsCreneauxPublics)
      .eq("statut_validation", "En attente");
    if (erreurPostulations) return { error: erreurPostulations.message };

    const { error: erreurCreneaux } = await supabaseAdmin
      .schema("td")
      .from("creneaux")
      .update({ statut_creneau: "cloture" })
      .in("id", idsCreneauxPublics);
    if (erreurCreneaux) return { error: erreurCreneaux.message };
  }

  const { error } = await supabaseAdmin
    .schema("td")
    .from("semaines")
    .update({ statut: "cloturee", date_cloture: new Date().toISOString() })
    .eq("id", semaineId);
  if (error) return { error: error.message };

  revalidatePlanning();
  return {};
}
