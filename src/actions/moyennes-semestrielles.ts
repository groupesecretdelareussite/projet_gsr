"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserScope, type UserScope } from "@/lib/auth-scope";
import { calculerMoyenneMatiere, calculerMoyenneGenerale, type NoteMatiere } from "@/lib/moyennes";
import type { Semestre } from "@/lib/constants";

async function getScopeAndAssert(): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (scope.role !== "coordonnateur") {
    throw new Error("Non autorisé");
  }
  return scope;
}

interface EleveActif {
  id: number;
  classe_id: number;
}

/**
 * Instantané de fin de semestre (sql/019) : recalcule la moyenne générale de
 * chaque élève actif pour `semestre` et l'enregistre dans
 * `moyennes_semestrielles`. Pas de service role : la policy
 * `moyennes_semestrielles_acces` autorise déjà le coordonnateur globalement,
 * comme `notes_acces` (§notes.ts). Rejouable à volonté (upsert) si une note
 * est corrigée après la clôture — les notes brutes ne sont jamais supprimées.
 */
export async function cloturerSemestre(semestre: Semestre): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert();
  const supabase = await createClient();

  const { data: anneeEnCours } = await supabase
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .maybeSingle();
  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  const [{ data: elevesData }, { data: matieresData }, { data: coefficientsData }] = await Promise.all([
    supabase.from("eleves").select("id, classe_id").eq("statut", "actif"),
    supabase.from("matieres").select("id").eq("actif", true),
    supabase.from("coefficients").select("classe_id, matiere_id, coefficient"),
  ]);

  const elevesActifs = (elevesData ?? []) as EleveActif[];
  const matiereIds = (matieresData ?? []).map((m) => m.id);
  if (elevesActifs.length === 0 || matiereIds.length === 0) return {};

  const coefficientParClasseMatiere = new Map(
    (coefficientsData ?? []).map((c) => [`${c.classe_id}-${c.matiere_id}`, Number(c.coefficient)])
  );

  const { data: notesData } = await supabase
    .from("notes")
    .select("eleve_id, matiere_id, type_note, valeur")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("semestre", semestre)
    .in("eleve_id", elevesActifs.map((e) => e.id));

  const notesParEleveEtMatiere = new Map<string, NoteMatiere[]>();
  for (const n of notesData ?? []) {
    const cle = `${n.eleve_id}-${n.matiere_id}`;
    const liste = notesParEleveEtMatiere.get(cle) ?? [];
    liste.push({ type_note: n.type_note, valeur: Number(n.valeur) });
    notesParEleveEtMatiere.set(cle, liste);
  }

  const lignes = elevesActifs.map((eleve) => {
    const matieresEvaluees = matiereIds.map((matiereId) => {
      const notes = notesParEleveEtMatiere.get(`${eleve.id}-${matiereId}`) ?? [];
      const coefficient = coefficientParClasseMatiere.get(`${eleve.classe_id}-${matiereId}`) ?? null;
      return { matiereId, resultat: calculerMoyenneMatiere(notes, coefficient) };
    });
    const { moyenneGenerale } = calculerMoyenneGenerale(matieresEvaluees);

    return {
      eleve_id: eleve.id,
      annee_scolaire_id: anneeEnCours.id,
      semestre,
      moyenne_generale: moyenneGenerale,
      cloture_par: scope.userId,
    };
  });

  const { error } = await supabase
    .from("moyennes_semestrielles")
    .upsert(lignes, { onConflict: "eleve_id,annee_scolaire_id,semestre" });
  if (error) return { error: error.message };

  revalidatePath("/admin/notes/suivi-moyennes");
  return {};
}
