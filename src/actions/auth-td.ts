"use server";

import bcrypt from "bcryptjs";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";
import { tropDeTentatives, enregistrerTentative, extraireIpClient } from "@/lib/brute-force";

/**
 * §10.1 GSR_ARCHITECTURE.md — branche "Professeur" du sélecteur /td/login,
 * portail "td" (§5.6) ; le coordonnateur passe par login() (actions/auth.ts,
 * portail "admin") puisqu'il réutilise la même session Supabase Auth
 * qu'ailleurs dans l'admin (§5.3).
 */
export async function connexionProfesseurTD(email: string, motDePasse: string): Promise<{ error?: string }> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) {
    return { error: "Identifiants invalides" };
  }

  const supabaseAdmin = createServiceRoleClient();
  const ip = await extraireIpClient();

  if (await tropDeTentatives(supabaseAdmin, cleanEmail, "td", ip)) {
    return { error: "Trop de tentatives, réessayez dans 15 minutes." };
  }

  const { data: professeur } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id, nom, prenom, mot_de_passe, actif, valide")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (!professeur || !professeur.actif || (professeur as { valide?: boolean }).valide === false) {
    await enregistrerTentative(supabaseAdmin, cleanEmail, "td", false, ip);
    return { error: "Identifiants invalides" };
  }

  const valide = await bcrypt.compare(motDePasse, professeur.mot_de_passe);
  await enregistrerTentative(supabaseAdmin, cleanEmail, "td", valide, ip);

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

/**
 * Changement de mot de passe en libre-service pour le professeur actuellement connecté.
 * Re-vérifie l'ancien mot de passe via bcrypt.compare avant de mettre à jour td.professeurs.mot_de_passe.
 */
export async function changerMonMotDePasseProf(ancienMdp: string, nouveauMdp: string): Promise<{ error?: string }> {
  if (!nouveauMdp || nouveauMdp.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  if (nouveauMdp.length > 128) {
    return { error: "Le mot de passe ne doit pas dépasser 128 caractères" };
  }

  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    return { error: "Non authentifié" };
  }

  const supabaseAdmin = createServiceRoleClient();
  const ip = await extraireIpClient();

  const { data: prof, error: fetchErr } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id, mot_de_passe, email, actif, valide")
    .eq("id", session.professeurId)
    .maybeSingle();

  if (fetchErr || !prof) {
    return { error: "Compte professeur introuvable" };
  }

  if (!prof.actif || (prof as { valide?: boolean }).valide === false) {
    return { error: "Compte inactif ou non validé" };
  }

  if (await tropDeTentatives(supabaseAdmin, prof.email, "td", ip)) {
    return { error: "Trop de tentatives, réessayez dans 15 minutes." };
  }

  const estValide = await bcrypt.compare(ancienMdp, prof.mot_de_passe);
  await enregistrerTentative(supabaseAdmin, prof.email, "td", estValide, ip);

  if (!estValide) {
    return { error: "Mot de passe actuel incorrect" };
  }

  const hash = await bcrypt.hash(nouveauMdp, 10);
  const { error: updateErr } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .update({ mot_de_passe: hash })
    .eq("id", session.professeurId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  return {};
}
