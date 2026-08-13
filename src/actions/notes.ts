"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserScope, type UserScope } from "@/lib/auth-scope";
import type { UserRole, TypeNote, Semestre } from "@/lib/constants";

const ROLES_NOTES: UserRole[] = ["coordonnateur", "comptable", "superviseur", "chef_site"];

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!ROLES_NOTES.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

export interface UpsertNoteInput {
  eleveId: number;
  matiereId: number;
  typeNote: TypeNote;
  valeur: number;
  anneeScolaireId: number;
  semestre: Semestre;
}

/**
 * §8.5 GSR_ARCHITECTURE.md — sauvegarde au blur d'une cellule de la grille de
 * notes. Pas de service role : la policy `notes_acces` (§4) scope déjà
 * correctement coordonnateur/comptable (global), superviseur (ses sites) et
 * chef_site (son site) — le client RLS suffit pour lire ET écrire.
 */
export async function upsertNote(input: UpsertNoteInput): Promise<{ error?: string }> {
  await getScopeAndAssert();

  if (input.valeur < 0 || input.valeur > 20) {
    return { error: "La note doit être comprise entre 0 et 20" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notes").upsert(
    {
      eleve_id: input.eleveId,
      matiere_id: input.matiereId,
      type_note: input.typeNote,
      valeur: input.valeur,
      annee_scolaire_id: input.anneeScolaireId,
      semestre: input.semestre,
    },
    { onConflict: "eleve_id,matiere_id,type_note,annee_scolaire_id,semestre" }
  );

  if (error) return { error: error.message };
  return {};
}
