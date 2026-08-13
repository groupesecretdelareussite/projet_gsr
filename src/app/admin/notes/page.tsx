import Link from "next/link";
import { NotebookText, Calculator, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { NotesGrid, type EleveOption, type MatiereOption, type NoteExistante } from "@/components/admin/notes/NotesGrid";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";
import { SEMESTRES, type Semestre } from "@/lib/constants";

export default async function NotesPage(
  props: {
    searchParams: Promise<{ site_id?: string; classe_id?: string; semestre?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const semestre: Semestre = searchParams.semestre === "2" ? 2 : 1;

  if (!["coordonnateur", "comptable", "superviseur", "chef_site"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Notes" />
        <EmptyState icon={NotebookText} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: sites }, { data: classes }, { data: matieres }, { data: anneeEnCours }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
    supabase.from("matieres").select("id, nom, code").eq("actif", true).order("ordre"),
    supabase.from("annees_scolaires").select("id").eq("statut", "en_cours").maybeSingle(),
  ]);

  const siteIdEffectif =
    searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const classeId = searchParams.classe_id ? Number(searchParams.classe_id) : undefined;

  let eleves: EleveOption[] = [];
  let notesExistantes: NoteExistante[] = [];

  if (classeId && anneeEnCours) {
    const { data: elevesData } = await supabase
      .from("eleves")
      .select("id, nom, prenoms")
      .eq("classe_id", classeId)
      .eq("statut", "actif")
      .order("nom");
    eleves = elevesData ?? [];

    if (eleves.length > 0) {
      const { data: notesData } = await supabase
        .from("notes")
        .select("eleve_id, matiere_id, type_note, valeur")
        .eq("annee_scolaire_id", anneeEnCours.id)
        .eq("semestre", semestre)
        .in(
          "eleve_id",
          eleves.map((e) => e.id)
        );
      notesExistantes = notesData ?? [];
    }
  }

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle="Saisie par matière, sauvegarde automatique"
        actions={
          <>
            <Link href="/admin/notes/moyennes">
              <Button variant="outline" size="sm">
                <Calculator className="w-3.5 h-3.5" />
                Moyennes
              </Button>
            </Link>
            {scope.role === "coordonnateur" && (
              <Link href="/admin/notes/suivi-moyennes">
                <Button variant="outline" size="sm">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Suivi Moyennes
                </Button>
              </Link>
            )}
          </>
        }
      />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
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
        <select name="semestre" defaultValue={String(semestre)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          {SEMESTRES.map((s) => (
            <option key={s} value={s}>
              Semestre {s}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      {!classeId ? (
        <EmptyState icon={NotebookText} title="Choisissez une classe" description="Sélectionnez une classe ci-dessus pour saisir ses notes." />
      ) : !anneeEnCours ? (
        <EmptyState icon={NotebookText} title="Aucune année scolaire en cours" description="Configurez une année scolaire en_cours avant de saisir des notes." />
      ) : eleves.length === 0 ? (
        <EmptyState icon={NotebookText} title="Aucun élève actif" description="Cette classe n'a aucun élève actif." />
      ) : (matieres ?? []).length === 0 ? (
        <EmptyState icon={NotebookText} title="Aucune matière active" description="Activez au moins une matière dans les données de référence." />
      ) : (
        <NotesGrid
          key={`${classeId}-${semestre}`}
          eleves={eleves}
          matieres={(matieres ?? []) as MatiereOption[]}
          notesExistantes={notesExistantes}
          anneeScolaireId={anneeEnCours.id}
          semestre={semestre}
        />
      )}
    </div>
  );
}
