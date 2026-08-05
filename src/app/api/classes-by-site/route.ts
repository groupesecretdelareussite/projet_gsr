import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScope, siteInScope } from "@/lib/auth-scope";

/**
 * §6.1 GSR_ARCHITECTURE.md — Route Handler pour le chargement dynamique des
 * classes par site (AJAX depuis le formulaire d'inscription).
 */
export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId requis" }, { status: 400 });
  }

  const supabase = await createClient();
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!siteInScope(scope, Number(siteId))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("classes")
    .select("id, nom_classe, ordre")
    .eq("site_id", siteId)
    .order("ordre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
