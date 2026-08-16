import Link from "next/link";
import { ClipboardCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PresencesCards, type EleveOption } from "@/components/admin/presences/PresencesCards";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { PresencesNav } from "@/components/admin/presences/PresencesNav";
import { Button } from "@/components/ui/button";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PresencesPage(
  props: {
    searchParams: Promise<{ site_id?: string; classe_id?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Présences" />
        <EmptyState icon={ClipboardCheck} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: sites }, { data: classes }, { data: anneeEnCours }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
    supabase.from("annees_scolaires").select("id").eq("statut", "en_cours").maybeSingle(),
  ]);

  const siteIdEffectif = estChefSiteOuSecretaire
    ? scope.siteId?.toString()
    : searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const classeId = searchParams.classe_id ? Number(searchParams.classe_id) : undefined;
  const classeSelectionnee = (classes ?? []).find((c) => c.id === classeId);
  const datePresence = aujourdhui();

  let eleves: EleveOption[] = [];
  let appelDejaFait = false;

  if (classeId && classeSelectionnee && anneeEnCours) {
    const [{ data: elevesData }, { data: appelExistant }] = await Promise.all([
      supabase.from("eleves").select("id, nom, prenoms").eq("classe_id", classeId).eq("statut", "actif").order("nom"),
      supabase.from("presences").select("id").eq("classe_id", classeId).eq("date_presence", datePresence).limit(1),
    ]);
    eleves = elevesData ?? [];
    appelDejaFait = (appelExistant?.length ?? 0) > 0;
  }

  return (
    <div>
      <PageHeader
        title="Présences"
        subtitle={`Appel du jour — ${new Date(datePresence).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`}
      />
      <PresencesNav active="appel" />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-xl">
        {!estChefSiteOuSecretaire && (
          <select
            name="site_id"
            defaultValue={siteIdEffectif ?? ""}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
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
          defaultValue={searchParams.classe_id ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Choisir une classe</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      {!classeId || !classeSelectionnee ? (
        <EmptyState icon={ClipboardCheck} title="Choisissez une classe" description="Sélectionnez une classe ci-dessus pour faire l'appel." />
      ) : !anneeEnCours ? (
        <EmptyState icon={ClipboardCheck} title="Aucune année scolaire en cours" description="Configurez une année scolaire en_cours avant de saisir les présences." />
      ) : eleves.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun élève actif" description="Cette classe n'a aucun élève actif." />
      ) : appelDejaFait ? (
        <EmptyState
          icon={Clock}
          title="Appel déjà effectué aujourd'hui"
          description="L'appel de cette classe est définitif pour la journée. Pour un élève arrivé en retard, utilisez Retardataires."
          action={
            <Link href="/admin/presences/retardataires">
              <Button variant="outline" size="sm">
                Retardataires
              </Button>
            </Link>
          }
        />
      ) : (
        <PresencesCards
          eleves={eleves}
          datePresence={datePresence}
          siteId={classeSelectionnee.site_id}
          classeId={classeId}
          anneeScolaireId={anneeEnCours.id}
        />
      )}
    </div>
  );
}
