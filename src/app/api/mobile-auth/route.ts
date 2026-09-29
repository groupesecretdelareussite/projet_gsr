import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { tropDeTentatives, enregistrerTentative } from "@/lib/brute-force";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip")?.trim() ?? null;

    const body = await request.json();
    const { type, identifier, password } = body;

    const supabaseAdmin = createServiceRoleClient();

    // 1. Authentification Staff Admin
    if (type === "staff") {
      const cleanUsername = identifier?.trim()?.toLowerCase();
      if (!cleanUsername || !password) {
        return NextResponse.json({ error: "Identifiants requis." }, { status: 400 });
      }

      if (await tropDeTentatives(supabaseAdmin, cleanUsername, "admin", ip)) {
        return NextResponse.json({ error: "Trop de tentatives, réessayez dans 15 minutes." }, { status: 429 });
      }

      const { data: userProfile, error: profileErr } = await supabaseAdmin
        .from("users")
        .select("id, email, role, site_id, actif, username")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (profileErr || !userProfile) {
        await enregistrerTentative(supabaseAdmin, cleanUsername, "admin", false, ip);
        return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect." }, { status: 400 });
      }

      if (!userProfile.actif) {
        await enregistrerTentative(supabaseAdmin, cleanUsername, "admin", false, ip);
        return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 403 });
      }

      // Connexion Supabase Auth avec l'email réel
      const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
        email: userProfile.email,
        password: password,
      });

      if (authErr || !authData.user) {
        await enregistrerTentative(supabaseAdmin, cleanUsername, "admin", false, ip);
        return NextResponse.json({ error: "Nom d'utilisateur ou mot de passe incorrect." }, { status: 400 });
      }

      await enregistrerTentative(supabaseAdmin, cleanUsername, "admin", true, ip);

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
      if (!cleanEmail || !password) {
        return NextResponse.json({ error: "Identifiants requis." }, { status: 400 });
      }

      if (await tropDeTentatives(supabaseAdmin, cleanEmail, "td", ip)) {
        return NextResponse.json({ error: "Trop de tentatives, réessayez dans 15 minutes." }, { status: 429 });
      }

      const { data: prof, error: profErr } = await supabaseAdmin
        .schema("td")
        .from("professeurs")
        .select("id, nom, prenom, email, mot_de_passe, actif, valide")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (profErr || !prof || !prof.actif || (prof as { valide?: boolean }).valide === false) {
        await enregistrerTentative(supabaseAdmin, cleanEmail, "td", false, ip);
        return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 400 });
      }

      const isValid = await bcrypt.compare(password, prof.mot_de_passe);
      await enregistrerTentative(supabaseAdmin, cleanEmail, "td", isValid, ip);

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
