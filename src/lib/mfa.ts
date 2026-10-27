import crypto from "crypto";
import bcrypt from "bcryptjs";

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L)
const CHARS_SECURITE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Normalise un code de secours : retire les tirets et espaces, convertit en majuscules.
 */
export function normaliserCodeSecours(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Formate un code normalisé sous la forme XXXX-XXXX pour une lisibilité optimale.
 */
export function formaterCodeSecours(code: string): string {
  const propre = normaliserCodeSecours(code);
  if (propre.length === 8) {
    return `${propre.slice(0, 4)}-${propre.slice(4)}`;
  }
  return propre;
}

/**
 * Génère un code de secours cryptographiquement sûr de 8 caractères.
 */
export function genererUnCodeSecours(): string {
  const bytes = crypto.randomBytes(8);
  let resultat = "";
  for (let i = 0; i < 8; i++) {
    resultat += CHARS_SECURITE[bytes[i] % CHARS_SECURITE.length];
  }
  return formaterCodeSecours(resultat);
}

/**
 * Génère un lot de codes de secours uniques (par défaut 5).
 */
export function genererLotCodesSecours(nombre = 5): string[] {
  const codes = new Set<string>();
  while (codes.size < nombre) {
    codes.add(genererUnCodeSecours());
  }
  return Array.from(codes);
}

/**
 * Hache un code de secours avec bcryptjs (coût 10) intégrant un sel cryptographique aléatoire unique.
 */
export async function hacherCodeSecours(code: string): Promise<string> {
  const normalise = normaliserCodeSecours(code);
  return bcrypt.hash(normalise, 10);
}

/**
 * Vérifie si un code saisi correspond à un hachage stocké.
 * Supporte les nouveaux hashs salés bcrypt et assure la rétrocompatibilité
 * avec les anciens hashs SHA-256 vérifiés en temps constant.
 */
export async function verifierCodeSecoursHash(codeSaisi: string, hashEnBase: string): Promise<boolean> {
  const normalise = normaliserCodeSecours(codeSaisi);

  // 1. Nouveaux codes hachés avec bcrypt ($2a$, $2b$, $2y$)
  if (hashEnBase.startsWith("$2")) {
    return bcrypt.compare(normalise, hashEnBase);
  }

  // 2. Fallback rétrocompatible pour les anciens hashs SHA-256 (temps constant)
  const hashSaisi = crypto.createHash("sha256").update(normalise).digest("hex");
  if (hashSaisi.length !== hashEnBase.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(hashSaisi), Buffer.from(hashEnBase));
}
