import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";

const ROLES_PAIEMENTS = ["coordonnateur", "comptable", "superviseur"];

/**
 * Recherche d'élèves actifs par nom, prénoms ou matricule — utilisé par
 * l'autocomplete de la page Paiements > Enregistrer. La RLS sur `eleves`
 * (policy `eleves_acces`) fait déjà le filtrage par site pour `superviseur`.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const supabase = await createClient();
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!ROLES_PAIEMENTS.includes(scope.role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, classes(nom_classe, sites(nom_site))")
    .eq("statut", "actif")
    .or(`nom.ilike.%${q}%,prenoms.ilike.%${q}%,matricule.ilike.%${q}%`)
    .order("nom")
    .limit(15);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
