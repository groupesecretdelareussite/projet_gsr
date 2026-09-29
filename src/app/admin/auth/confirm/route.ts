import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cible du lien envoyé par `resetPasswordForEmail()` (voir actions/auth.ts).
 * Échange le code de récupération (ou token_hash) contre une vraie session Supabase Auth
 * (cookies httpOnly posés par le client serveur) avant de rediriger vers le
 * formulaire de nouveau mot de passe, qui peut alors s'appuyer sur cette
 * session comme n'importe quelle page /admin protégée.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Détermination de l'origine publique (gère les reverse proxies Vercel, Cloudflare, etc.)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}/admin/reinitialiser-mot-de-passe`);
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(`${baseUrl}/admin/reinitialiser-mot-de-passe`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/admin/login?erreur=lien_invalide`);
}
