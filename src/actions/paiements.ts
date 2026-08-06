"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope, siteInScope, type UserScope } from "@/lib/auth-scope";
import { resteAPayer } from "@/lib/paiements";
import type { MoisScolaire, ModePaiement, UserRole } from "@/lib/constants";

const ROLES_PAIEMENTS = ["coordonnateur", "comptable", "superviseur"] as const;
const ROLES_SUPPRESSION = ["coordonnateur", "comptable"] as const;

function revalidatePaiementsPaths() {
  revalidatePath("/admin/paiements/historique");
  revalidatePath("/admin/paiements/a-jour");
  revalidatePath("/admin/paiements/en-retard");
  revalidatePath("/admin/paiements/supprimes");
  revalidatePath("/admin/tableau-de-bord");
}

async function getScopeAndAssert(roles: readonly UserRole[]): Promise<UserScope> {
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  if (!roles.includes(scope.role)) {
    throw new Error("Non autorisé");
  }
  return scope;
}

export interface EnregistrerPaiementInput {
  eleveId: number;
  moisSouscription: MoisScolaire;
  montantPaye: number;
  datePaiement: string;
  modePaiement: ModePaiement;
}

/** §8.7/§12.5 GSR_ARCHITECTURE.md — le montant payé ne peut jamais dépasser le reste dû. */
export async function enregistrerPaiement(
  input: EnregistrerPaiementInput
): Promise<{ error?: string; resteApresPaiement?: number; montantAttendu?: number }> {
  const scope = await getScopeAndAssert(ROLES_PAIEMENTS);
  const supabaseAdmin = createServiceRoleClient();

  if (input.montantPaye <= 0) return { error: "Montant invalide" };

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id, statut, classe_id, classes(site_id)")
    .eq("id", input.eleveId)
    .single();

  if (!eleve || eleve.statut !== "actif") return { error: "Élève introuvable ou suspendu" };
  const siteId = (eleve as unknown as { classes: { site_id: number } }).classes.site_id;
  if (!siteInScope(scope, siteId)) return { error: "Non autorisé sur ce site" };

  const { data: fraisTd } = await supabaseAdmin
    .from("frais_td")
    .select("montant")
    .eq("classe_id", eleve.classe_id)
    .single();

  if (!fraisTd) return { error: "Aucun montant de frais TD configuré pour cette classe" };

  const { data: anneeEnCours } = await supabaseAdmin
    .from("annees_scolaires")
    .select("id")
    .eq("statut", "en_cours")
    .single();

  if (!anneeEnCours) return { error: "Aucune année scolaire en cours" };

  const { data: paiementsExistants } = await supabaseAdmin
    .from("paiements")
    .select("montant_paye")
    .eq("eleve_id", input.eleveId)
    .eq("mois_souscription", input.moisSouscription)
    .eq("annee_scolaire_id", anneeEnCours.id);

  const resteAvant = resteAPayer(Number(fraisTd.montant), paiementsExistants ?? []);

  if (input.montantPaye > resteAvant) {
    return { error: `Le montant dépasse le reste dû (${resteAvant} F)` };
  }

  const { error } = await supabaseAdmin.from("paiements").insert({
    eleve_id: input.eleveId,
    mois_souscription: input.moisSouscription,
    montant_paye: input.montantPaye,
    date_paiement: input.datePaiement,
    mode_paiement: input.modePaiement,
    annee_scolaire_id: anneeEnCours.id,
  });

  if (error) return { error: error.message };

  revalidatePaiementsPaths();
  return { resteApresPaiement: resteAvant - input.montantPaye, montantAttendu: Number(fraisTd.montant) };
}

/**
 * §8.7/interdit #4 — suppression réservée coordonnateur/comptable (jamais
 * superviseur, interdit #17), mot de passe + motif vérifiés côté serveur.
 * Le staff utilise Supabase Auth (pas de hash bcrypt exposé côté app) : la
 * vérification du mot de passe se fait en ré-authentifiant l'utilisateur
 * courant via signInWithPassword, équivalent fonctionnel du bcryptjs.compare
 * décrit dans GSR_ARCHITECTURE.md pour les auths custom (parents/TD).
 */
export async function supprimerPaiement(
  paiementId: number,
  motif: string,
  password: string
): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert(ROLES_SUPPRESSION);
  if (!motif.trim()) return { error: "Motif obligatoire" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non authentifié" };

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) return { error: "Mot de passe incorrect" };

  const supabaseAdmin = createServiceRoleClient();

  const { data: paiement } = await supabaseAdmin
    .from("paiements")
    .select(
      "id, mois_souscription, montant_paye, date_paiement, mode_paiement, eleves(matricule, classes(site_id))"
    )
    .eq("id", paiementId)
    .single();

  if (!paiement) return { error: "Paiement introuvable" };

  const eleve = (paiement as unknown as { eleves: { matricule: string; classes: { site_id: number } } }).eleves;
  if (!siteInScope(scope, eleve.classes.site_id)) return { error: "Non autorisé sur ce site" };

  const { error: insertError } = await supabaseAdmin.from("paiements_supprimes").insert({
    matricule: eleve.matricule,
    mois_souscription: paiement.mois_souscription,
    montant_paye: paiement.montant_paye,
    date_paiement: paiement.date_paiement,
    mode_paiement: paiement.mode_paiement,
    admin_id: scope.userId,
    motif: motif.trim(),
  });
  if (insertError) return { error: insertError.message };

  const { error: deleteError } = await supabaseAdmin.from("paiements").delete().eq("id", paiementId);
  if (deleteError) return { error: deleteError.message };

  revalidatePaiementsPaths();
  return {};
}

/** §12.4/§13 — jamais d'envoi automatique : on journalise le clic, l'utilisateur envoie lui-même via le lien wa.me. */
export async function enregistrerRelanceWhatsapp(
  matricule: string,
  moisSouscription: MoisScolaire,
  montantRestant: number,
  contactParent: string
): Promise<{ error?: string }> {
  const scope = await getScopeAndAssert(ROLES_PAIEMENTS);
  const supabaseAdmin = createServiceRoleClient();

  const { error } = await supabaseAdmin.from("log_whatsapp").insert({
    matricule,
    mois_souscription: moisSouscription,
    montant_restant: montantRestant,
    contact_parent: contactParent,
    envoye_par: scope.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/paiements/en-retard");
  return {};
}
