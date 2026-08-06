import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";

// Même périmètre que la fiche élève (/admin/eleves/[id]) — secretaire exclue
// (dashboard uniquement, aucun droit sur les élèves).
const ROLES_RECHERCHE_ELEVES = ["coordonnateur", "comptable", "superviseur", "chef_site"];

/**
 * Recherche d'élèves actifs par nom, prénoms ou matricule — utilisée par
 * l'autocomplete de la page Paiements > Enregistrer et par la recherche
 * globale de la Topbar (navigue vers la fiche élève). La RLS sur `eleves`
 * (policy `eleves_acces`) fait déjà le filtrage par site pour
 * `superviseur`/`chef_site`.
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

  if (!ROLES_RECHERCHE_ELEVES.includes(scope.role)) {
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
