"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getTdProfesseurSession } from "@/lib/session-td";
import { tropDeTentatives, enregistrerTentative, extraireIpClient } from "@/lib/brute-force";
import { normaliserNumero, validerNumeroTelephone } from "@/lib/telephone";

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

export interface ModifierMonProfilProfInput {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  zoneId: number;
  matierePrincipaleId: number;
}

/**
  * Modification en libre-service par le professeur connecté de ses propres informations.
  * Met à jour ses coordonnées dans `td.professeurs` ainsi que sa session active.
  */
export async function modifierMonProfilProf(input: ModifierMonProfilProfInput): Promise<{ error?: string }> {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    return { error: "Non authentifié" };
  }

  const nom = input.nom?.trim();
  const prenom = input.prenom?.trim();
  if (!nom || nom.length < 2 || nom.length > 100) {
    return { error: "Le nom doit comporter entre 2 et 100 caractères" };
  }
  if (!prenom || prenom.length < 2 || prenom.length > 100) {
    return { error: "Le prénom doit comporter entre 2 et 100 caractères" };
  }

  const email = input.email?.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 150) {
    return { error: "Adresse email invalide" };
  }

  const telNormalise = normaliserNumero(input.telephone ?? "");
  const erreurTel = validerNumeroTelephone(telNormalise);
  if (erreurTel) {
    return { error: erreurTel };
  }

  if (!input.zoneId || isNaN(input.zoneId)) {
    return { error: "Veuillez sélectionner une zone géographique" };
  }
  if (!input.matierePrincipaleId || isNaN(input.matierePrincipaleId)) {
    return { error: "Veuillez sélectionner votre matière principale" };
  }

  const supabaseAdmin = createServiceRoleClient();

  // Vérifier compte actif et validé
  const { data: prof, error: fetchErr } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id, actif, valide")
    .eq("id", session.professeurId)
    .maybeSingle();

  if (fetchErr || !prof) {
    return { error: "Compte professeur introuvable" };
  }
  if (!prof.actif || (prof as { valide?: boolean }).valide === false) {
    return { error: "Compte inactif ou non validé" };
  }

  // Vérifier doublon email avec un autre professeur
  const { data: autreProfEmail } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id")
    .eq("email", email)
    .neq("id", session.professeurId)
    .maybeSingle();

  if (autreProfEmail) {
    return { error: "Cette adresse email est déjà associée à un autre compte professeur" };
  }

  // Vérifier doublon téléphone avec un autre professeur
  const { data: autreProfTel } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id")
    .eq("telephone", telNormalise)
    .neq("id", session.professeurId)
    .maybeSingle();

  if (autreProfTel) {
    return { error: "Ce numéro de téléphone est déjà associé à un autre compte professeur" };
  }

  // Vérifier l'existence de la zone et de la matière
  const [{ data: zone }, { data: matiere }] = await Promise.all([
    supabaseAdmin.schema("td").from("zones").select("id").eq("id", input.zoneId).maybeSingle(),
    supabaseAdmin.schema("td").from("matieres_td").select("id").eq("id", input.matierePrincipaleId).maybeSingle(),
  ]);

  if (!zone) {
    return { error: "La zone sélectionnée n'existe pas" };
  }
  if (!matiere) {
    return { error: "La matière sélectionnée n'existe pas" };
  }

  const { error: updateErr } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .update({
      nom,
      prenom,
      telephone: telNormalise,
      email,
      zone_id: input.zoneId,
      matiere_principale_id: input.matierePrincipaleId,
    })
    .eq("id", session.professeurId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  session.nom = nom;
  session.prenom = prenom;
  await session.save();

  revalidatePath("/td/prof/mon-compte");
  revalidatePath("/td/coord/config/professeurs");

  return {};
}
