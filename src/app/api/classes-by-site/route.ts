import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScope, siteInScope } from "@/lib/auth-scope";

const SiteIdSchema = z.coerce.number().int().positive();

/**
 * §6.1 GSR_ARCHITECTURE.md — Route Handler pour le chargement dynamique des
 * classes par site (AJAX depuis le formulaire d'inscription).
 */
export async function GET(request: NextRequest) {
  const parsedSiteId = SiteIdSchema.safeParse(request.nextUrl.searchParams.get("siteId"));
  if (!parsedSiteId.success) {
    return NextResponse.json({ error: "siteId invalide" }, { status: 400 });
  }
  const siteId = parsedSiteId.data;

  const supabase = await createClient();
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!siteInScope(scope, siteId)) {
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
