import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { PresencesCards, type EleveOption, type PresenceExistante } from "@/components/admin/presences/PresencesCards";

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PresencesPage({
  searchParams,
}: {
  searchParams: { site_id?: string; classe_id?: string; date?: string };
}) {
  const supabase = createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur", "chef_site"].includes(scope.role)) {
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

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = searchParams.site_id
    ? (classes ?? []).filter((c) => String(c.site_id) === searchParams.site_id)
    : classes ?? [];

  const classeId = searchParams.classe_id ? Number(searchParams.classe_id) : undefined;
  const classeSelectionnee = (classes ?? []).find((c) => c.id === classeId);
  const datePresence = searchParams.date ?? aujourdhui();

  let eleves: EleveOption[] = [];
  let presencesExistantes: PresenceExistante[] = [];

  if (classeId && classeSelectionnee && anneeEnCours) {
    const { data: elevesData } = await supabase
      .from("eleves")
      .select("id, nom, prenoms")
      .eq("classe_id", classeId)
      .eq("statut", "actif")
      .order("nom");
    eleves = elevesData ?? [];

    if (eleves.length > 0) {
      const { data: presencesData } = await supabase
        .from("presences")
        .select("eleve_id, present")
        .eq("date_presence", datePresence)
        .in(
          "eleve_id",
          eleves.map((e) => e.id)
        );
      presencesExistantes = presencesData ?? [];
    }
  }

  return (
    <div>
      <PageHeader title="Présences" subtitle="Appel du jour par classe" />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
        <select
          name="site_id"
          defaultValue={searchParams.site_id ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous les sites</option>
          {sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom_site}
            </option>
          ))}
        </select>
        <select
          name="classe_id"
          defaultValue={searchParams.classe_id ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Choisir une classe</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {searchParams.site_id ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date"
          defaultValue={datePresence}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <button type="submit" className="hidden">
          Filtrer
        </button>
      </form>

      {!classeId || !classeSelectionnee ? (
        <EmptyState icon={ClipboardCheck} title="Choisissez une classe" description="Sélectionnez une classe ci-dessus pour faire l'appel." />
      ) : !anneeEnCours ? (
        <EmptyState icon={ClipboardCheck} title="Aucune année scolaire en cours" description="Configurez une année scolaire en_cours avant de saisir les présences." />
      ) : eleves.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun élève actif" description="Cette classe n'a aucun élève actif." />
      ) : (
        <PresencesCards
          eleves={eleves}
          presencesExistantes={presencesExistantes}
          datePresence={datePresence}
          siteId={classeSelectionnee.site_id}
          classeId={classeId}
          anneeScolaireId={anneeEnCours.id}
          nomClasse={classeSelectionnee.nom_classe}
          nomSite={nomSiteParId.get(classeSelectionnee.site_id) ?? ""}
          peutExporter={scope.role !== "chef_site"}
        />
      )}
    </div>
  );
}
