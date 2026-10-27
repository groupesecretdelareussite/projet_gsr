"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { tropDeTentatives, enregistrerTentative, extraireIpClient } from "@/lib/brute-force";
import { ADMIN_ACTIVITY_COOKIE, ADMIN_ACTIVITY_COOKIE_OPTIONS } from "@/lib/admin-activity-cookie";

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NODE_ENV === "production"
    ? "https://groupe-secretdelareussite.com"
    : "http://localhost:3000";
}

import {
  genererLotCodesSecours,
  hacherCodeSecours,
  verifierCodeSecoursHash,
} from "@/lib/mfa";

/**
 * §5.1 GSR_ARCHITECTURE.md — l'écran /admin/login ne demande que
 * username + mot de passe. Supabase Auth ne connaît que l'email : on résout
 * d'abord l'email associé via le client service role (RLS interdit toute
 * lecture non authentifiée sur `users`), puis on authentifie normalement.
 * Si le compte a configuré la 2FA (TOTP), renvoie { requireMfa: true }.
 */
export async function login(username: string, password: string): Promise<{ error?: string; requireMfa?: boolean }> {
  const cleanUsername = username?.trim().toLowerCase();
  if (!cleanUsername) {
    return { error: "Identifiants invalides" };
  }

  const supabaseAdmin = createServiceRoleClient();
  const ip = await extraireIpClient();

  if (await tropDeTentatives(supabaseAdmin, cleanUsername, "admin", ip)) {
    return { error: "Trop de tentatives, réessayez dans 15 minutes." };
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("email, actif")
    .eq("username", cleanUsername)
    .single();

  if (!profile || !profile.actif) {
    await enregistrerTentative(supabaseAdmin, cleanUsername, "admin", false, ip);
    return { error: "Identifiants invalides" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  await enregistrerTentative(supabaseAdmin, cleanUsername, "admin", !error, ip);

  if (error) {
    return { error: "Identifiants invalides" };
  }

  // Vérifier si un facteur TOTP vérifié est actif sur ce compte
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData && aalData.nextLevel === "aal2" && aalData.currentLevel === "aal1") {
    // Mot de passe correct, mais second facteur (TOTP) requis
    // On ne pose pas encore ADMIN_ACTIVITY_COOKIE pour empêcher l'accès au tableau de bord
    return { requireMfa: true };
  }

  const c = await cookies();
  c.set(ADMIN_ACTIVITY_COOKIE, "1", ADMIN_ACTIVITY_COOKIE_OPTIONS);

  return {};
}

/**
 * Vérifie le code TOTP à 6 chiffres émis par Google Authenticator lors de la connexion.
 */
export async function verifierCodeMfa(code: string): Promise<{ error?: string; success?: boolean }> {
  const cleanCode = code?.replace(/[\s-]/g, "").trim();
  if (!cleanCode || cleanCode.length !== 6) {
    return { error: "Le code de vérification doit comporter 6 chiffres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session invalide ou expirée. Veuillez vous reconnecter." };
  }

  const supabaseAdmin = createServiceRoleClient();
  const ip = await extraireIpClient();

  if (await tropDeTentatives(supabaseAdmin, user.id, "admin", ip)) {
    return { error: "Trop de tentatives MFA infructueuses. Veuillez patienter 15 minutes." };
  }

  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return { error: factorsError.message };
  }

  const verifiedFactor = factors?.totp?.find((f) => f.status === "verified");
  if (!verifiedFactor) {
    return { error: "Aucun facteur 2FA actif trouvé sur ce compte." };
  }

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: verifiedFactor.id,
    code: cleanCode,
  });

  if (verifyError) {
    await enregistrerTentative(supabaseAdmin, user.id, "admin", false, ip);
    return { error: "Code incorrect. Vérifiez l'heure de votre téléphone ou réessayez." };
  }

  await enregistrerTentative(supabaseAdmin, user.id, "admin", true, ip);

  const c = await cookies();
  c.set(ADMIN_ACTIVITY_COOKIE, "1", ADMIN_ACTIVITY_COOKIE_OPTIONS);

  return { success: true };
}

/**
 * Valide un code de secours (backup code) à usage unique issu de la fiche PDF.
 */
export async function verifierCodeSecours(code: string): Promise<{ error?: string; success?: boolean; codesRestants?: number }> {
  const cleanCode = code?.trim();
  if (!cleanCode) {
    return { error: "Veuillez saisir un code de secours." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Session invalide ou expirée. Veuillez vous reconnecter." };
  }

  const supabaseAdmin = createServiceRoleClient();
  const ip = await extraireIpClient();

  if (await tropDeTentatives(supabaseAdmin, user.id, "admin", ip)) {
    return { error: "Trop de tentatives avec un code de secours. Veuillez patienter 15 minutes." };
  }

  const { data: backupRows, error: dbError } = await supabaseAdmin
    .from("mfa_backup_codes")
    .select("id, code_hash")
    .eq("user_id", user.id)
    .eq("utilise", false);

  if (dbError) {
    return { error: dbError.message };
  }

  let matchingRow = null;
  for (const r of backupRows ?? []) {
    if (await verifierCodeSecoursHash(cleanCode, r.code_hash)) {
      matchingRow = r;
      break;
    }
  }

  if (!matchingRow) {
    await enregistrerTentative(supabaseAdmin, user.id, "admin", false, ip);
    return { error: "Code de secours invalide ou déjà utilisé." };
  }

  await enregistrerTentative(supabaseAdmin, user.id, "admin", true, ip);

  // Consommer le code (usage unique strict)
  await supabaseAdmin
    .from("mfa_backup_codes")
    .update({ utilise: true, utilise_le: new Date().toISOString() })
    .eq("id", matchingRow.id);

  const c = await cookies();
  c.set(ADMIN_ACTIVITY_COOKIE, "1", ADMIN_ACTIVITY_COOKIE_OPTIONS);

  const codesRestants = Math.max(0, (backupRows?.length ?? 1) - 1);
  return { success: true, codesRestants };
}

/**
 * Initialise l'enrôlement 2FA (génère le secret et le QR Code SVG).
 */
export async function initierEnrolementMfa(): Promise<{
  error?: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Non authentifié" };
  }

  // Nettoyer d'éventuels facteurs non vérifiés issus d'essais précédents annulés
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.totp ?? []) {
    if ((f.status as string) === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "GSR Admin",
    friendlyName: user.email,
  });

  if (error || !data) {
    return { error: error?.message ?? "Échec de l'enrôlement 2FA" };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/**
 * Valide le premier code à 6 chiffres pour certifier l'enrôlement,
 * puis génère et enregistre les 5 codes de secours à usage unique.
 */
export async function validerEnrolementMfa(
  factorId: string,
  code: string
): Promise<{ error?: string; backupCodes?: string[] }> {
  const cleanCode = code?.replace(/[\s-]/g, "").trim();
  if (!cleanCode || cleanCode.length !== 6) {
    return { error: "Le code de vérification doit comporter 6 chiffres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: cleanCode,
  });

  if (verifyError) {
    return { error: "Code incorrect. Vérifiez l'heure de votre téléphone et réessayez." };
  }

  // Générer les 5 codes de secours
  const plainCodes = genererLotCodesSecours(5);
  const supabaseAdmin = createServiceRoleClient();

  // Remplacer d'anciens codes de secours s'il en existait
  await supabaseAdmin.from("mfa_backup_codes").delete().eq("user_id", user.id);

  const rows = await Promise.all(
    plainCodes.map(async (c) => ({
      user_id: user.id,
      code_hash: await hacherCodeSecours(c),
      utilise: false,
    }))
  );

  const { error: insertError } = await supabaseAdmin.from("mfa_backup_codes").insert(rows);
  if (insertError) {
    return { error: "2FA activé mais erreur lors de la génération des codes de secours." };
  }

  return { backupCodes: plainCodes };
}

/**
 * Retourne l'état 2FA du compte connecté.
 */
export async function obtenirStatutMfa(): Promise<{
  actif: boolean;
  dateActivation?: string;
  codesRestants: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { actif: false, codesRestants: 0 };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = factors?.totp?.find((f) => f.status === "verified");

  if (!verifiedTotp) {
    return { actif: false, codesRestants: 0 };
  }

  const supabaseAdmin = createServiceRoleClient();
  const { count } = await supabaseAdmin
    .from("mfa_backup_codes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("utilise", false);

  return {
    actif: true,
    dateActivation: verifiedTotp.created_at,
    codesRestants: count ?? 0,
  };
}

/**
 * Désactive le 2FA sur son propre compte après confirmation du mot de passe.
 */
export async function desactiverMonMfa(motDePasse: string): Promise<{ error?: string }> {
  if (!motDePasse) {
    return { error: "Veuillez saisir votre mot de passe actuel." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Non authentifié" };
  }

  const { error: pwdError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: motDePasse,
  });

  if (pwdError) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const supabaseAdmin = createServiceRoleClient();
  await supabaseAdmin.from("mfa_backup_codes").delete().eq("user_id", user.id);

  return {};
}

/**
 * Régénère un nouveau jeu de 5 codes de secours après confirmation du mot de passe.
 */
export async function regenererMesCodesSecours(motDePasse: string): Promise<{ error?: string; backupCodes?: string[] }> {
  if (!motDePasse) {
    return { error: "Veuillez saisir votre mot de passe actuel." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Non authentifié" };
  }

  const { error: pwdError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: motDePasse,
  });

  if (pwdError) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const plainCodes = genererLotCodesSecours(5);
  const supabaseAdmin = createServiceRoleClient();

  await supabaseAdmin.from("mfa_backup_codes").delete().eq("user_id", user.id);

  const rows = await Promise.all(
    plainCodes.map(async (c) => ({
      user_id: user.id,
      code_hash: await hacherCodeSecours(c),
      utilise: false,
    }))
  );

  const { error: insertError } = await supabaseAdmin.from("mfa_backup_codes").insert(rows);
  if (insertError) {
    return { error: "Erreur lors de l'enregistrement des nouveaux codes." };
  }

  return { backupCodes: plainCodes };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const c = await cookies();
  c.delete(ADMIN_ACTIVITY_COOKIE);
}

/**
 * Rafraîchit le backstop serveur du timeout d'inactivité (§5.6) — appelée
 * par AdminInactivityWatcher à chaque signe d'activité détecté (throttlé à
 * une fois par minute). Sans cet appel, le cookie expire 20 min après la
 * connexion même si l'utilisateur reste actif ; voir proxy.ts pour la
 * vérification côté serveur qui en dépend.
 */
export async function prolongerSessionAdmin() {
  const c = await cookies();
  c.set(ADMIN_ACTIVITY_COOKIE, "1", ADMIN_ACTIVITY_COOKIE_OPTIONS);
}

/**
 * Changement de mot de passe en libre-service — n'importe quel rôle
 * connecté, pour son propre compte uniquement (§6, page
 * parametres/changer-mot-de-passe). L'ancien mot de passe est re-vérifié via
 * `signInWithPassword` avant `updateUser`, pour éviter qu'une session
 * laissée ouverte permette de changer le mot de passe sans le connaître.
 */
export async function changerMonMotDePasse(ancienMdp: string, nouveauMdp: string): Promise<{ error?: string }> {
  if (nouveauMdp.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Non authentifié" };

  const { error: verifError } = await supabase.auth.signInWithPassword({ email: user.email, password: ancienMdp });
  if (verifError) return { error: "Mot de passe actuel incorrect" };

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) return { error: error.message };

  return {};
}

/**
 * Flux natif Supabase Auth « mot de passe oublié », demandé explicitement
 * pour le coordonnateur — mais s'applique techniquement à tout rôle admin,
 * tous partageant le même mécanisme Supabase Auth (§5.1). Ne révèle jamais
 * si l'email existe (même logique anti-énumération que le reste de
 * l'authentification) : toujours un succès générique côté appelant.
 */
export async function demanderReinitialisationMotDePasse(email: string): Promise<void> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) return;

  const supabase = await createClient();
  const baseUrl = getAppBaseUrl();

  await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${baseUrl}/admin/auth/confirm`,
  });
}

/**
 * Étape finale du flux ci-dessus : appelée depuis /admin/reinitialiser-mot-de-passe,
 * atteinte uniquement après que le Route Handler /admin/auth/confirm ait
 * échangé le code de récupération contre une vraie session Supabase Auth.
 */
export async function definirNouveauMotDePasse(nouveauMdp: string): Promise<{ error?: string }> {
  if (nouveauMdp.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session de réinitialisation expirée — recommencez la demande." };

  const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  return {};
}
