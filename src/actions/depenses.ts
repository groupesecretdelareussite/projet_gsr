"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, type UserScope } from "@/lib/auth-scope";

/** §11 GSR_ARCHITECTURE.md — Comptabilité globale, accès coordonnateur + comptable. */
async function getScopeAndAssert(): Promise<UserScope> {
  const scope = await getUserScope(createClient());
  if (!["coordonnateur", "comptable"].includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateComptabilitePath() {
  revalidatePath("/admin/comptabilite");
}

export interface CreerDepenseInput {
  categorieId: number;
  libelle: string;
  montant: number;
  dateDepense: string; // ISO yyyy-mm-dd
  anneeScolaireId: number;
}

export async function creerDepense(input: CreerDepenseInput): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  if (!(input.montant > 0)) return { error: "Le montant doit être supérieur à 0" };

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from("depenses_annexes").insert({
    categorie_id: input.categorieId,
    libelle: input.libelle,
    montant: input.montant,
    date_depense: input.dateDepense,
    saisi_par: scope.userId,
    annee_scolaire_id: input.anneeScolaireId,
  });
  if (error) return { error: error.message };

  revalidateComptabilitePath();
  return {};
}

export interface ModifierDepenseInput {
  id: number;
  categorieId: number;
  libelle: string;
  montant: number;
  dateDepense: string;
}

export async function modifierDepense(input: ModifierDepenseInput): Promise<{ error?: string }> {
  await getScopeAndAssert();
  if (!(input.montant > 0)) return { error: "Le montant doit être supérieur à 0" };

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin
    .from("depenses_annexes")
    .update({
      categorie_id: input.categorieId,
      libelle: input.libelle,
      montant: input.montant,
      date_depense: input.dateDepense,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };

  revalidateComptabilitePath();
  return {};
}

export async function supprimerDepense(id: number): Promise<{ error?: string }> {
  await getScopeAndAssert();

  const supabaseAdmin = createServiceRoleClient();
  const { error } = await supabaseAdmin.from("depenses_annexes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateComptabilitePath();
  return {};
}

/** Catégorie personnalisée (non système) — §11 "Gestion des catégories personnalisées". */
export async function ajouterCategorie(nom: string): Promise<{ error?: string; id?: number }> {
  await getScopeAndAssert();
  if (!nom.trim()) return { error: "Le nom de la catégorie est requis" };

  const supabaseAdmin = createServiceRoleClient();
  const { data, error } = await supabaseAdmin
    .from("categories_depenses")
    .insert({ nom: nom.trim(), systeme: false })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidateComptabilitePath();
  return { id: data.id };
}
