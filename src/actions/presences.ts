"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserScope, type UserScope } from "@/lib/auth-scope";
import type { UserRole } from "@/lib/constants";

const ROLES_PRESENCES: UserRole[] = ["coordonnateur", "comptable", "superviseur", "chef_site"];

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!ROLES_PRESENCES.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

export interface UpsertPresenceInput {
  eleveId: number;
  datePresence: string; // YYYY-MM-DD
  siteId: number;
  classeId: number;
  anneeScolaireId: number;
  present: boolean;
}

/**
 * §8.6 GSR_ARCHITECTURE.md — case à cocher par élève. Pas de service role :
 * la policy `presences_acces` (§4) scope directement sur `presences.site_id`
 * (coordonnateur/comptable global, superviseur/chef_site sur leur(s) site(s)).
 */
export async function upsertPresence(input: UpsertPresenceInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  const supabase = await createClient();
  const { error } = await supabase.from("presences").upsert(
    {
      eleve_id: input.eleveId,
      date_presence: input.datePresence,
      site_id: input.siteId,
      classe_id: input.classeId,
      annee_scolaire_id: input.anneeScolaireId,
      present: input.present,
    },
    { onConflict: "eleve_id,date_presence" }
  );

  if (error) return { error: error.message };
  return {};
}

export interface MarquerTousInput {
  eleveIds: number[];
  datePresence: string;
  siteId: number;
  classeId: number;
  anneeScolaireId: number;
  present: boolean;
}

/** Boutons "Tout présent"/"Tout absent" — un seul upsert multi-lignes plutôt que N appels séquentiels. */
export async function marquerTousPresence(input: MarquerTousInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  if (input.eleveIds.length === 0) return {};

  const supabase = await createClient();
  const rows = input.eleveIds.map((eleveId) => ({
    eleve_id: eleveId,
    date_presence: input.datePresence,
    site_id: input.siteId,
    classe_id: input.classeId,
    annee_scolaire_id: input.anneeScolaireId,
    present: input.present,
  }));

  const { error } = await supabase.from("presences").upsert(rows, { onConflict: "eleve_id,date_presence" });
  if (error) return { error: error.message };
  return {};
}
