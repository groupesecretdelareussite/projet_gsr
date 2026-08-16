import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";

// Même périmètre que la fiche élève (/admin/eleves/[id]) — secretaire exclue
// (dashboard uniquement, aucun droit sur les élèves).
const ROLES_RECHERCHE_ELEVES = ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"];

// Liste blanche stricte : `q` est interpolé dans une chaîne de filtre
// PostgREST (.or(), voir plus bas) qui a sa propre syntaxe (virgule, point,
// parenthèses = caractères spéciaux). N'autoriser que lettres/chiffres/
// espace/apostrophe/tiret élimine structurellement tout risque d'injection
// dans ce mini-langage, plutôt que d'essayer d'échapper au cas par cas.
const RechercheSchema = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[\p{L}0-9 '-]+$/u);

/**
 * Recherche d'élèves actifs par nom, prénoms ou matricule — utilisée par
 * l'autocomplete de la page Paiements > Enregistrer et par la recherche
 * globale de la Topbar (navigue vers la fiche élève). La RLS sur `eleves`
 * (policy `eleves_acces`) fait déjà le filtrage par site pour
 * `superviseur`/`chef_site`.
 */
export async function GET(request: NextRequest) {
  const parsed = RechercheSchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json([]);
  const q = parsed.data;

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
