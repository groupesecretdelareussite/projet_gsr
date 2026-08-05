import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cible du lien envoyé par `resetPasswordForEmail()` (voir actions/auth.ts).
 * Échange le code de récupération contre une vraie session Supabase Auth
 * (cookies httpOnly posés par le client serveur) avant de rediriger vers le
 * formulaire de nouveau mot de passe, qui peut alors s'appuyer sur cette
 * session comme n'importe quelle page /admin protégée.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/admin/reinitialiser-mot-de-passe`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?erreur=lien_invalide`);
}
