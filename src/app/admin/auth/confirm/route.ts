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
function getAppBaseUrl(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Détermination sécurisée de l'origine publique (priorité aux variables d'environnement canoniques)
  const baseUrl = getAppBaseUrl(request);

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
