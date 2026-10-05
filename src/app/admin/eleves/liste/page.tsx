import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";
import { PaginationNav } from "@/components/admin/PaginationNav";
import { recupererTousLesElevesPourExport } from "@/actions/eleves";
import { ElevesTableInteractive, type EleveRow } from "@/components/admin/eleves/ElevesTableInteractive";

export default async function ListeElevesPage(
  props: {
    searchParams: Promise<{ site_id?: string; classe_id?: string; college?: string; nom?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const peutGerer = scope.role !== "chef_site" && scope.role !== "secretaire";
  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";
  const estCoordonnateur = scope.role === "coordonnateur";

  const siteIdEffectif = estChefSiteOuSecretaire
    ? scope.siteId?.toString()
    : searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);

  const [{ data: sites }, { data: classes }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const classeIdValide =
    searchParams.classe_id && classesFiltrees.some((c) => String(c.id) === searchParams.classe_id)
      ? searchParams.classe_id
      : undefined;

  const PAGE_SIZE = 50;
  const pageNumber = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (pageNumber - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("eleves")
    .select(
      "id, matricule, nom, prenoms, contact_parent, contact_parent_2, option_m, classes!inner(nom_classe, site_id, sites(nom_site))",
      { count: "exact" }
    )
    .eq("statut", "actif")
    .order("nom")
    .range(from, to);

  if (siteIdEffectif) query = query.eq("classes.site_id", siteIdEffectif);
  if (classeIdValide) query = query.eq("classe_id", classeIdValide);
  if (searchParams.college) query = query.ilike("college", `%${searchParams.college}%`);
  if (searchParams.nom) query = query.ilike("nom", `%${searchParams.nom}%`);

  const { data: eleves, count: totalElevesBrut } = await query;
  const totalEleves = totalElevesBrut ?? 0;
  const totalPages = Math.ceil(totalEleves / PAGE_SIZE);

  const elevesFiltres = (eleves ?? []) as unknown as EleveRow[];

  const nomSiteTitre = siteIdEffectif ? nomSiteParId.get(Number(siteIdEffectif)) ?? "Site inconnu" : "Tous les sites";
  const dateExport = new Date().toLocaleDateString("fr-FR");

  return (
    <div>
      <PageHeader
        title="Élèves"
        subtitle={
          totalPages > 1
            ? `${totalEleves} élève(s) actif(s) — Page ${pageNumber} sur ${totalPages}`
            : `${totalEleves} élève(s) actif(s)`
        }
        actions={
          peutGerer ? (
            <Link href="/admin/eleves/inscription">
              <Button>
                <UserPlus className="w-4 h-4" />
                Inscrire un élève
              </Button>
            </Link>
          ) : undefined
        }
      />

      <form method="get" className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {!estChefSiteOuSecretaire && (
          <select
            name="site_id"
            defaultValue={siteIdEffectif ?? ""}
            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
          >
            <option value="">Tous les sites</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom_site}
              </option>
            ))}
          </select>
        )}
        <select
          name="classe_id"
          defaultValue={classeIdValide ?? ""}
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
        >
          <option value="">Toutes les classes</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <input
          name="college"
          defaultValue={searchParams.college ?? ""}
          placeholder="Collège"
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
        />
        <input
          name="nom"
          defaultValue={searchParams.nom ?? ""}
          placeholder="Nom"
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary truncate"
        />
        <AutoSubmitOnChange />
      </form>

      <ElevesTableInteractive
        eleves={elevesFiltres}
        peutGerer={peutGerer}
        estCoordonnateur={estCoordonnateur}
        exportConfig={
          peutGerer
            ? {
                titre: `Liste des élèves — ${nomSiteTitre} — ${dateExport}`,
                onExport: recupererTousLesElevesPourExport.bind(null, {
                  siteId: siteIdEffectif,
                  classeId: classeIdValide,
                  college: searchParams.college,
                  nom: searchParams.nom,
                }),
                nomFichier: `Liste_eleves_${nomSiteTitre}_${dateExport}`.replace(/\s+/g, "_"),
                nomFeuille: "Élèves",
              }
            : undefined
        }
      />

      <div className="mt-4">
        <PaginationNav
          pageActuelle={pageNumber}
          totalPages={totalPages}
          totalItems={totalEleves}
          taillePage={PAGE_SIZE}
          itemLabel="élèves"
        />
      </div>
    </div>
  );
}
