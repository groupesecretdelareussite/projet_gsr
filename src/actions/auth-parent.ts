"use server";

import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { getParentSession } from "@/lib/session-parent";

const MAX_TENTATIVES = 5;
const FENETRE_MINUTES = 15;

/** Même politique anti-brute-force que l'admin (§5.6), portail "parent" au lieu de "admin". */
async function tropDeTentatives(supabaseAdmin: ReturnType<typeof createServiceRoleClient>, identifiant: string) {
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifiant", identifiant)
    .eq("portail", "parent")
    .eq("reussi", false)
    .gte("date_tentative", depuis);

  return (count ?? 0) >= MAX_TENTATIVES;
}

async function enregistrerTentative(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  reussi: boolean
) {
  await supabaseAdmin.from("login_attempts").insert({ identifiant, portail: "parent", reussi });
}

/**
 * §9 Écran A. Service role obligatoire : les parents n'ont pas de session
 * Supabase Auth, donc pas de RLS possible tant qu'ils ne sont pas connectés
 * via ce mécanisme séparé (iron-session).
 */
export async function connexionParent(matricule: string, motDePasse: string): Promise<{ error?: string }> {
  const supabaseAdmin = createServiceRoleClient();

  if (await tropDeTentatives(supabaseAdmin, matricule)) {
    return { error: "Trop de tentatives, réessayez dans 15 minutes." };
  }

  const { data: compte } = await supabaseAdmin
    .from("comptes_parents")
    .select("mot_de_passe")
    .eq("matricule", matricule)
    .maybeSingle();

  if (!compte) {
    await enregistrerTentative(supabaseAdmin, matricule, false);
    return { error: "Identifiants invalides" };
  }

  const valide = await bcrypt.compare(motDePasse, compte.mot_de_passe);
  await enregistrerTentative(supabaseAdmin, matricule, valide);

  if (!valide) {
    return { error: "Identifiants invalides" };
  }

  await supabaseAdmin
    .from("comptes_parents")
    .update({ derniere_connexion: new Date().toISOString() })
    .eq("matricule", matricule);

  const session = await getParentSession();
  session.matricule = matricule;
  await session.save();

  return {};
}

export interface CreerCompteParentInput {
  matricule: string;
  motDePasse: string;
}

/** §9 Écran B — le matricule doit déjà exister dans `eleves` (quel que soit son statut, §12.10). */
export async function creerCompteParent(input: CreerCompteParentInput): Promise<{ error?: string }> {
  if (input.motDePasse.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: eleve } = await supabaseAdmin
    .from("eleves")
    .select("id")
    .eq("matricule", input.matricule)
    .maybeSingle();
  if (!eleve) {
    return { error: "Matricule introuvable" };
  }

  const { data: compteExistant } = await supabaseAdmin
    .from("comptes_parents")
    .select("id")
    .eq("matricule", input.matricule)
    .maybeSingle();
  if (compteExistant) {
    return { error: "Un compte existe déjà pour ce matricule — connectez-vous plutôt." };
  }

  const hash = await bcrypt.hash(input.motDePasse, 10);
  const { error } = await supabaseAdmin
    .from("comptes_parents")
    .insert({ matricule: input.matricule, mot_de_passe: hash });
  if (error) return { error: error.message };

  const session = await getParentSession();
  session.matricule = input.matricule;
  await session.save();

  return {};
}

export async function deconnexionParent() {
  const session = await getParentSession();
  session.destroy();
}

/**
 * §5.7 GSR_ARCHITECTURE.md — les parents n'ont pas de flux natif « mot de
 * passe oublié » (pas de Supabase Auth). Réinitialisation manuelle,
 * réservée au coordonnateur.
 */
export async function reinitialiserMotDePasseParent(matricule: string, nouveauMdp: string): Promise<{ error?: string }> {
  const scope = await getUserScope(createClient());
  if (scope.role !== "coordonnateur") throw new Error("Non autorisé");

  if (nouveauMdp.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }

  const supabaseAdmin = createServiceRoleClient();

  const { data: compte } = await supabaseAdmin
    .from("comptes_parents")
    .select("id")
    .eq("matricule", matricule)
    .maybeSingle();
  if (!compte) return { error: "Aucun compte parent pour ce matricule" };

  const hash = await bcrypt.hash(nouveauMdp, 10);
  const { error } = await supabaseAdmin.from("comptes_parents").update({ mot_de_passe: hash }).eq("matricule", matricule);
  if (error) return { error: error.message };

  return {};
}

/**
 * §5.6 GSR_ARCHITECTURE.md — fenêtre glissante de 20 min : le cookie
 * iron-session a un `maxAge` fixe calculé depuis la connexion, donc sans
 * appel périodique il expirerait même si le parent reste actif. Appelée par
 * ParentInactivityWatcher tant qu'il y a de l'activité.
 */
export async function prolongerSessionParent(): Promise<{ error?: string }> {
  const session = await getParentSession();
  if (!session.matricule) return { error: "Session expirée" };
  await session.save();
  return {};
}
