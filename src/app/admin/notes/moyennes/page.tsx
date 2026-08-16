import { AlertTriangle, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";
import { calculerMoyenneMatiere, calculerMoyenneGenerale, type NoteMatiere } from "@/lib/moyennes";
import { SEMESTRES, type Semestre } from "@/lib/constants";

interface EleveRow {
  id: number;
  nom: string;
  prenoms: string;
}

interface MatiereRef {
  id: number;
  nom: string;
}

/**
 * §Notes > Moyennes — estimation en temps réel du semestre sélectionné,
 * calculée sur les notes actuellement saisies (pas d'attente de la clôture).
 * Réservé aux mêmes rôles que Notes (coordonnateur/comptable/superviseur/
 * chef_site). Le registre officiel figé par semestre + la moyenne annuelle
 * (MA) sont sur /admin/notes/suivi-moyennes (coordonnateur).
 */
export default async function MoyennesPage(
  props: {
    searchParams: Promise<{ site_id?: string; classe_id?: string; semestre?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const semestre: Semestre = searchParams.semestre === "2" ? 2 : 1;
  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";

  if (!["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Moyennes" />
        <EmptyState icon={Calculator} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: sites }, { data: classes }, { data: matieres }, { data: anneeEnCours }] = await Promise.all([
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
    supabase.from("matieres").select("id, nom").eq("actif", true).order("ordre"),
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
  const matieresList = (matieres ?? []) as MatiereRef[];

  let eleves: EleveRow[] = [];
  const notesParEleveEtMatiere = new Map<string, NoteMatiere[]>();
  let coefficientParMatiere = new Map<number, number>();

  if (classeId && anneeEnCours) {
    const [{ data: elevesData }, { data: coefficientsData }] = await Promise.all([
      supabase.from("eleves").select("id, nom, prenoms").eq("classe_id", classeId).eq("statut", "actif").order("nom"),
      supabase.from("coefficients").select("matiere_id, coefficient").eq("classe_id", classeId),
    ]);
    eleves = elevesData ?? [];
    coefficientParMatiere = new Map((coefficientsData ?? []).map((c) => [c.matiere_id, Number(c.coefficient)]));

    if (eleves.length > 0) {
      const { data: notesData } = await supabase
        .from("notes")
        .select("eleve_id, matiere_id, type_note, valeur")
        .eq("annee_scolaire_id", anneeEnCours.id)
        .eq("semestre", semestre)
        .in("eleve_id", eleves.map((e) => e.id));

      for (const n of notesData ?? []) {
        const cle = `${n.eleve_id}-${n.matiere_id}`;
        const liste = notesParEleveEtMatiere.get(cle) ?? [];
        liste.push({ type_note: n.type_note, valeur: Number(n.valeur) });
        notesParEleveEtMatiere.set(cle, liste);
      }
    }
  }

  // Matières avec au moins une note saisie mais sans coefficient configuré — garde-fou (§ demande explicite).
  const matieresSansCoefficientMaisAvecNotes = matieresList.filter((m) => {
    if (coefficientParMatiere.has(m.id)) return false;
    return eleves.some((e) => {
      const notes = notesParEleveEtMatiere.get(`${e.id}-${m.id}`) ?? [];
      return calculerMoyenneMatiere(notes, null).moyenneMatiere !== null;
    });
  });

  const columns: DataTableColumn<EleveRow>[] = [
    {
      key: "eleve",
      label: "Élève",
      render: (e) => (
        <span className="font-medium">
          {e.nom} {e.prenoms}
        </span>
      ),
    },
    ...matieresList.map(
      (m): DataTableColumn<EleveRow> => ({
        key: `matiere-${m.id}`,
        label: coefficientParMatiere.has(m.id) ? `${m.nom} (coef. ${coefficientParMatiere.get(m.id)})` : `${m.nom} — coef. absent`,
        render: (e) => {
          const notes = notesParEleveEtMatiere.get(`${e.id}-${m.id}`) ?? [];
          const resultat = calculerMoyenneMatiere(notes, coefficientParMatiere.get(m.id) ?? null);
          return resultat.moyenneMatiere !== null ? resultat.moyenneMatiere.toFixed(2) : "—";
        },
      })
    ),
    {
      key: "moyenne-generale",
      label: "Moyenne générale",
      render: (e) => {
        const matieresEvaluees = matieresList.map((m) => {
          const notes = notesParEleveEtMatiere.get(`${e.id}-${m.id}`) ?? [];
          return { matiereId: m.id, resultat: calculerMoyenneMatiere(notes, coefficientParMatiere.get(m.id) ?? null) };
        });
        const { moyenneGenerale } = calculerMoyenneGenerale(matieresEvaluees);
        return <span className="font-bold text-primary">{moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : "—"}</span>;
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Moyennes" subtitle={`Estimation en temps réel — Semestre ${semestre}`} />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 max-w-2xl">
        {!estChefSiteOuSecretaire && (
          <select name="site_id" defaultValue={siteIdEffectif ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">Tous les sites</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom_site}
              </option>
            ))}
          </select>
        )}
        <select name="classe_id" defaultValue={searchParams.classe_id ?? ""} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
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

      {matieresSansCoefficientMaisAvecNotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Coefficient non configuré pour : {matieresSansCoefficientMaisAvecNotes.map((m) => m.nom).join(", ")}. Ces matières ont
            des notes saisies mais ne sont pas comptées dans la moyenne générale tant que leur coefficient n&apos;est pas défini
            (Paramètres &gt; Coefficients).
          </span>
        </div>
      )}

      {!classeId ? (
        <EmptyState icon={Calculator} title="Choisissez une classe" description="Sélectionnez une classe ci-dessus." />
      ) : !anneeEnCours ? (
        <EmptyState icon={Calculator} title="Aucune année scolaire en cours" description="Configurez une année scolaire en_cours." />
      ) : eleves.length === 0 ? (
        <EmptyState icon={Calculator} title="Aucun élève actif" description="Cette classe n'a aucun élève actif." />
      ) : (
        <DataTable columns={columns} rows={eleves} rowKey={(e) => e.id} />
      )}
    </div>
  );
}
