"use server";

import bcrypt from "bcryptjs";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";

const MAX_TENTATIVES = 5;
const FENETRE_MINUTES = 15;

/**
 * Même politique anti-brute-force que l'admin/parent (§5.6), portail "td" —
 * couvre ici la branche professeur ; le coordonnateur passe par login()
 * (actions/auth.ts, portail "admin") puisqu'il réutilise la même session
 * Supabase Auth qu'ailleurs dans l'admin (§5.3).
 */
async function tropDeTentatives(supabaseAdmin: ReturnType<typeof createServiceRoleClient>, identifiant: string) {
  const depuis = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("identifiant", identifiant)
    .eq("portail", "td")
    .eq("reussi", false)
    .gte("date_tentative", depuis);

  return (count ?? 0) >= MAX_TENTATIVES;
}

async function enregistrerTentative(
  supabaseAdmin: ReturnType<typeof createServiceRoleClient>,
  identifiant: string,
  reussi: boolean
) {
  await supabaseAdmin.from("login_attempts").insert({ identifiant, portail: "td", reussi });
}

/** §10.1 GSR_ARCHITECTURE.md — branche "Professeur" du sélecteur /td/login. */
export async function connexionProfesseurTD(email: string, motDePasse: string): Promise<{ error?: string }> {
  const supabaseAdmin = createServiceRoleClient();

  if (await tropDeTentatives(supabaseAdmin, email)) {
    return { error: "Trop de tentatives, réessayez dans 15 minutes." };
  }

  const { data: professeur } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id, nom, prenom, mot_de_passe, actif")
    .eq("email", email)
    .maybeSingle();

  if (!professeur || !professeur.actif) {
    await enregistrerTentative(supabaseAdmin, email, false);
    return { error: "Identifiants invalides" };
  }

  const valide = await bcrypt.compare(motDePasse, professeur.mot_de_passe);
  await enregistrerTentative(supabaseAdmin, email, valide);

  if (!valide) {
    return { error: "Identifiants invalides" };
  }

  const session = await getTdProfesseurSession();
  session.professeurId = professeur.id;
  session.nom = professeur.nom;
  session.prenom = professeur.prenom;
  await session.save();

  return {};
}

export async function deconnexionProfesseurTD() {
  const session = await getTdProfesseurSession();
  session.destroy();
}

/**
 * §5.6 — fenêtre glissante de 20 min, même raisonnement que
 * prolongerSessionParent() : le cookie iron-session a un maxAge fixe depuis
 * la connexion, donc à ré-appeler périodiquement tant qu'il y a de l'activité.
 */
export async function prolongerSessionProfesseurTD(): Promise<{ error?: string }> {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) return { error: "Session expirée" };
  await session.save();
  return {};
}
