import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, identifier, password } = body;

    const supabaseAdmin = createServiceRoleClient();

    // 1. Authentification Staff Admin
    if (type === "staff") {
      const cleanUsername = identifier?.trim()?.toLowerCase();
      const { data: userProfile, error: profileErr } = await supabaseAdmin
        .from("users")
        .select("id, email, role, site_id, actif, username")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (profileErr || !userProfile) {
        return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect." }, { status: 400 });
      }

      if (!userProfile.actif) {
        return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 403 });
      }

      // Connexion Supabase Auth avec l'email réel
      const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
        email: userProfile.email,
        password: password,
      });

      if (authErr || !authData.user) {
        return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect." }, { status: 400 });
      }

      let siteIds: number[] = [];
      if (userProfile.role === "superviseur") {
        const { data: sites } = await supabaseAdmin
          .from("user_sites")
          .select("site_id")
          .eq("user_id", userProfile.id);
        siteIds = sites?.map((s) => s.site_id) ?? [];
      }

      return NextResponse.json({
        user: {
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          role: userProfile.role,
          siteId: userProfile.site_id,
          siteIds,
        },
        session: authData.session,
      });
    }

    // 2. Authentification Professeur TD
    if (type === "prof") {
      const cleanEmail = identifier?.trim()?.toLowerCase();
      const { data: prof, error: profErr } = await supabaseAdmin
        .schema("td")
        .from("professeurs")
        .select("id, nom, prenom, email, mot_de_passe, actif")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (profErr || !prof || !prof.actif) {
        return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 400 });
      }

      const isValid = await bcrypt.compare(password, prof.mot_de_passe);
      if (!isValid) {
        return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 400 });
      }

      return NextResponse.json({
        user: {
          id: prof.id,
          email: prof.email,
          nom: prof.nom,
          prenom: prof.prenom,
          role: "professeur",
        },
      });
    }

    return NextResponse.json({ error: "Type d'authentification invalide" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}
