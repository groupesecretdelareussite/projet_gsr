"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope, type UserScope } from "@/lib/auth-scope";
import type { UserRole } from "@/lib/constants";
import type { TypeGainRecompense } from "@/lib/recompenses";

const ROLES_RECOMPENSES: UserRole[] = ["coordonnateur", "comptable", "superviseur"];

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!ROLES_RECOMPENSES.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

function revalidateRecompensesPaths() {
  revalidatePath("/admin/recompenses");
  revalidatePath("/admin/recompenses/cumul");
  revalidatePath("/admin/comptabilite");
}

export interface NoteEligibleInput {
  noteId: number;
  typeGain: TypeGainRecompense;
  montant: number;
}

export interface PayerRecompensesEleveInput {
  eleveId: number;
  mois: string;
  anneeScolaireId: number;
  notes: NoteEligibleInput[];
}

export interface EleveToutPayerInput {
  eleveId: number;
  siteId: number;
  nom: string;
  prenoms: string;
  nomClasse: string;
  notes: NoteEligibleInput[];
}

export interface ToutPayerRecompensesInput {
  mois: string;
  anneeScolaireId: number;
  eleves: EleveToutPayerInput[];
}

/** Récupère ou résout l'ID de la catégorie de dépense "Récompense". */
async function obtenirCategorieRecompense(supabaseAdmin: ReturnType<typeof createServiceRoleClient>): Promise<number> {
  const { data: cat } = await supabaseAdmin
    .from("categories_depenses")
    .select("id")
    .ilike("nom", "récompense%")
    .maybeSingle();

  if (cat) return cat.id;

  // Fallback si pas encore créée
  const { data: nouvelleCat, error } = await supabaseAdmin
    .from("categories_depenses")
    .insert({ nom: "Récompense", systeme: true })
    .select("id")
    .single();

  if (error || !nouvelleCat) {
    throw new Error("Impossible de trouver ou créer la catégorie de dépense 'Récompense'");
  }
  return nouvelleCat.id;
}

/**
 * Enregistre le paiement des récompenses pour un élève spécifique :
 * 1. Crée une ligne dans `depenses_annexes` rattachée à la catégorie 'Récompense'.
 * 2. Insère les lignes correspondantes dans `public.recompenses` pour verrouiller
 *    chaque note payée et éviter tout double décaissement.
 */
export async function payerRecompensesEleve(input: PayerRecompensesEleveInput): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();

  if (input.notes.length === 0) {
    return { error: "Aucune note à payer" };
  }

  const supabaseAdmin = createServiceRoleClient();

  // Vérification de l'élève et de son site dans le périmètre
  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, nom, prenoms, classe_id, classes(nom_classe, site_id)")
    .eq("id", input.eleveId)
    .single();

  if (!eleve) return { error: "Élève introuvable" };
  const eleveInfo = eleve as unknown as {
    id: number;
    nom: string;
    prenoms: string;
    classes: { nom_classe: string; site_id: number } | null;
  };
  const siteId = eleveInfo.classes?.site_id;
  if (!siteId || !siteInScope(scope, siteId)) {
    return { error: "Non autorisé sur ce site" };
  }

  // Vérifier qu'aucune des notes n'a déjà été payée (défense en profondeur)
  const noteIds = input.notes.map((n) => n.noteId);
  const { data: dejaPayees } = await supabaseAdmin
    .from("recompenses")
    .select("note_id")
    .in("note_id", noteIds);

  const dejaPayeesSet = new Set((dejaPayees ?? []).map((r) => r.note_id));
  const notesAPayer = input.notes.filter((n) => !dejaPayeesSet.has(n.noteId));

  if (notesAPayer.length === 0) {
    return { error: "Toutes les récompenses sélectionnées ont déjà été payées." };
  }

  const montantTotal = notesAPayer.reduce((sum, n) => sum + n.montant, 0);
  const categorieId = await obtenirCategorieRecompense(supabaseAdmin);
  const datePaiement = new Date().toISOString().slice(0, 10);
  const nomClasse = eleveInfo.classes?.nom_classe ?? "";

  // 1. Création de la dépense annexe
  const { data: depense, error: depenseError } = await supabaseAdmin
    .from("depenses_annexes")
    .insert({
      categorie_id: categorieId,
      libelle: `Récompense ${input.mois} — ${eleveInfo.nom} ${eleveInfo.prenoms} (${nomClasse})`,
      montant: montantTotal,
      date_depense: datePaiement,
      saisi_par: scope.userId,
      annee_scolaire_id: input.anneeScolaireId,
    })
    .select("id")
    .single();

  if (depenseError || !depense) {
    return { error: depenseError?.message ?? "Erreur lors de la création de la dépense" };
  }

  // 2. Insertion dans public.recompenses
  const recompensesRows = notesAPayer.map((n) => ({
    note_id: n.noteId,
    eleve_id: input.eleveId,
    annee_scolaire_id: input.anneeScolaireId,
    mois: input.mois,
    type_gain: n.typeGain,
    montant: n.montant,
    depense_id: depense.id,
    paye_par: scope.userId,
    date_paiement: datePaiement,
  }));

  const { error: recompensesError } = await supabaseAdmin.from("recompenses").insert(recompensesRows);
  if (recompensesError) {
    return { error: recompensesError.message };
  }

  revalidateRecompensesPaths();
  return {};
}

/**
 * Paiement groupé ("Tout payer") pour tous les élèves méritants d'un mois
 * dans le périmètre de l'utilisateur connecté.
 */
export async function toutPayerRecompenses(input: ToutPayerRecompensesInput): Promise<{ error?: string; nbPayes?: number }> {
  const scope = await getScopeAndAssert();

  if (input.eleves.length === 0) {
    return { error: "Aucun élève à payer" };
  }

  const supabaseAdmin = createServiceRoleClient();
  const categorieId = await obtenirCategorieRecompense(supabaseAdmin);
  const datePaiement = new Date().toISOString().slice(0, 10);

  // Filtrer les élèves éligibles dans le scope de l'utilisateur
  const elevesAutorises = input.eleves.filter((e) => siteInScope(scope, e.siteId));

  if (elevesAutorises.length === 0) {
    return { error: "Aucun élève dans votre périmètre d'autorisation" };
  }

  let totalPayes = 0;

  for (const e of elevesAutorises) {
    const noteIds = e.notes.map((n) => n.noteId);
    if (noteIds.length === 0) continue;

    const { data: dejaPayees } = await supabaseAdmin
      .from("recompenses")
      .select("note_id")
      .in("note_id", noteIds);

    const dejaPayeesSet = new Set((dejaPayees ?? []).map((r) => r.note_id));
    const notesAPayer = e.notes.filter((n) => !dejaPayeesSet.has(n.noteId));

    if (notesAPayer.length === 0) continue;

    const montantTotal = notesAPayer.reduce((sum, n) => sum + n.montant, 0);

    const { data: depense, error: depenseError } = await supabaseAdmin
      .from("depenses_annexes")
      .insert({
        categorie_id: categorieId,
        libelle: `Récompense ${input.mois} — ${e.nom} ${e.prenoms} (${e.nomClasse})`,
        montant: montantTotal,
        date_depense: datePaiement,
        saisi_par: scope.userId,
        annee_scolaire_id: input.anneeScolaireId,
      })
      .select("id")
      .single();

    if (depenseError || !depense) continue;

    const recompensesRows = notesAPayer.map((n) => ({
      note_id: n.noteId,
      eleve_id: e.eleveId,
      annee_scolaire_id: input.anneeScolaireId,
      mois: input.mois,
      type_gain: n.typeGain,
      montant: n.montant,
      depense_id: depense.id,
      paye_par: scope.userId,
      date_paiement: datePaiement,
    }));

    const { error: recompensesError } = await supabaseAdmin.from("recompenses").insert(recompensesRows);
    if (!recompensesError) {
      totalPayes++;
    }
  }

  revalidateRecompensesPaths();
  return { nbPayes: totalPayes };
}
