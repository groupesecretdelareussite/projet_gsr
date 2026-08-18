import { Trophy, Award, CheckCircle2, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiCard } from "@/components/admin/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { RecompensesNav } from "@/components/admin/recompenses/RecompensesNav";
import { DetailsRecompensesDialog, type NoteDetail } from "@/components/admin/recompenses/DetailsRecompensesDialog";
import { PayerRecompenseButton } from "@/components/admin/recompenses/PayerRecompenseButton";
import { ToutPayerButton } from "@/components/admin/recompenses/ToutPayerButton";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";
import { plageDatesMoisScolaire } from "@/lib/presences";
import { evaluerNoteRecompense } from "@/lib/recompenses";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface NoteRowFromDB {
  id: number;
  eleve_id: number;
  valeur: number;
  type_note: string;
  updated_at: string;
  matieres: { id: number; nom: string; code: string } | null;
  eleves: {
    id: number;
    matricule: string;
    nom: string;
    prenoms: string;
    statut: string;
    classe_id: number;
    classes: { id: number; nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
  } | null;
}

interface RecompenseRowFromDB {
  id: number;
  note_id: number;
  eleve_id: number;
  montant: number;
  date_paiement: string;
}

interface EleveMeritantRow {
  eleveId: number;
  matricule: string;
  nom: string;
  prenoms: string;
  nomClasse: string;
  nomSite: string;
  siteId: number;
  classeId: number;
  notes: NoteDetail[];
  totalDu: number;
  totalPaye: number;
  totalRestant: number;
  statut: "paye" | "a_payer" | "partiel";
}

export default async function RecompensesPage(
  props: {
    searchParams: Promise<{ annee_id?: string; mois?: string; site_id?: string; classe_id?: string; statut?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!["coordonnateur", "comptable", "superviseur"].includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Récompenses financières" />
        <EmptyState icon={Trophy} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const [{ data: annees }, { data: sites }, { data: classes }] = await Promise.all([
    supabase.from("annees_scolaires").select("id, libelle, statut, date_debut, date_fin").order("date_debut", { ascending: false }),
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  const anneesList = annees ?? [];
  const anneeSelectionnee =
    (searchParams.annee_id ? anneesList.find((a) => a.id === Number(searchParams.annee_id)) : undefined) ??
    anneesList.find((a) => a.statut === "en_cours") ??
    anneesList[0];

  const siteIdEffectif =
    searchParams.site_id ?? (scope.role === "superviseur" ? (await lireFiltreSiteSuperviseur())?.toString() : undefined);

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const moisSelectionne = (
    MOIS_SCOLAIRES.includes(searchParams.mois as MoisScolaire) ? searchParams.mois : MOIS_SCOLAIRES[0]
  ) as MoisScolaire;

  let elevesMeritants: EleveMeritantRow[] = [];

  if (anneeSelectionnee) {
    const { debut, fin } = plageDatesMoisScolaire(moisSelectionne, {
      dateDebut: anneeSelectionnee.date_debut,
      dateFin: anneeSelectionnee.date_fin,
    });

    const [{ data: notesData }, { data: recompensesData }] = await Promise.all([
      supabase
        .from("notes")
        .select(
          "id, eleve_id, valeur, type_note, updated_at, matieres!inner(id, nom, code), eleves!inner(id, matricule, nom, prenoms, statut, classe_id, classes!inner(id, nom_classe, site_id, sites(nom_site)))"
        )
        .eq("annee_scolaire_id", anneeSelectionnee.id)
        .gte("updated_at", `${debut}T00:00:00Z`)
        .lte("updated_at", `${fin}T23:59:59.999Z`),
      supabase
        .from("recompenses")
        .select("id, note_id, eleve_id, montant, date_paiement")
        .eq("annee_scolaire_id", anneeSelectionnee.id)
        .eq("mois", moisSelectionne),
    ]);

    const notesRows = (notesData ?? []) as unknown as NoteRowFromDB[];
    const recompensesRows = (recompensesData ?? []) as unknown as RecompenseRowFromDB[];
    const recompenseParNote = new Map(recompensesRows.map((r) => [r.note_id, r]));

    // Grouper par élève
    const notesParEleve = new Map<number, NoteDetail[]>();
    const eleveInfoParId = new Map<number, NoteRowFromDB["eleves"]>();

    for (const note of notesRows) {
      if (!note.matieres || !note.eleves) continue;

      const evalRes = evaluerNoteRecompense({
        typeNote: note.type_note,
        valeur: Number(note.valeur),
        codeMatiere: note.matieres.code,
      });

      if (!evalRes.eligible || !evalRes.typeGain) continue;

      const recompenseVersee = recompenseParNote.get(note.id);
      const detail: NoteDetail = {
        noteId: note.id,
        matiereNom: note.matieres.nom,
        codeMatiere: note.matieres.code,
        typeNote: note.type_note,
        valeur: Number(note.valeur),
        typeGain: evalRes.typeGain,
        montant: evalRes.montant,
        estPayee: Boolean(recompenseVersee),
        datePaiement: recompenseVersee?.date_paiement ?? null,
      };

      const liste = notesParEleve.get(note.eleve_id) ?? [];
      liste.push(detail);
      notesParEleve.set(note.eleve_id, liste);
      eleveInfoParId.set(note.eleve_id, note.eleves);
    }

    // Transformer en lignes du tableau
    for (const [eleveId, notesList] of notesParEleve.entries()) {
      const info = eleveInfoParId.get(eleveId);
      if (!info || !info.classes) continue;

      const totalDu = notesList.reduce((s, n) => s + n.montant, 0);
      const totalPaye = notesList.filter((n) => n.estPayee).reduce((s, n) => s + n.montant, 0);
      const totalRestant = totalDu - totalPaye;

      const statut: EleveMeritantRow["statut"] =
        totalRestant === 0 ? "paye" : totalPaye === 0 ? "a_payer" : "partiel";

      elevesMeritants.push({
        eleveId,
        matricule: info.matricule,
        nom: info.nom,
        prenoms: info.prenoms,
        nomClasse: info.classes.nom_classe,
        nomSite: info.classes.sites?.nom_site ?? "—",
        siteId: info.classes.site_id,
        classeId: info.classes.id,
        notes: notesList,
        totalDu,
        totalPaye,
        totalRestant,
        statut,
      });
    }
  }

  // Application des filtres de recherche
  if (siteIdEffectif) {
    elevesMeritants = elevesMeritants.filter((e) => String(e.siteId) === siteIdEffectif);
  }
  if (searchParams.classe_id) {
    elevesMeritants = elevesMeritants.filter((e) => String(e.classeId) === searchParams.classe_id);
  }
  if (searchParams.statut && searchParams.statut !== "tous") {
    if (searchParams.statut === "paye") {
      elevesMeritants = elevesMeritants.filter((e) => e.statut === "paye");
    } else if (searchParams.statut === "a_payer") {
      elevesMeritants = elevesMeritants.filter((e) => e.statut === "a_payer" || e.statut === "partiel");
    }
  }

  // Tri alphabétique par nom
  elevesMeritants.sort((a, b) => a.nom.localeCompare(b.nom));

  // KPIs
  const totalElevesMeritants = elevesMeritants.length;
  const montantTotalMois = elevesMeritants.reduce((s, e) => s + e.totalDu, 0);
  const montantDejaVerse = elevesMeritants.reduce((s, e) => s + e.totalPaye, 0);
  const montantResteAPayer = elevesMeritants.reduce((s, e) => s + e.totalRestant, 0);

  // Liste des élèves ayant des récompenses impayées pour le bouton "Tout payer"
  const elevesPourToutPayer = elevesMeritants
    .filter((e) => e.totalRestant > 0)
    .map((e) => ({
      eleveId: e.eleveId,
      siteId: e.siteId,
      nom: e.nom,
      prenoms: e.prenoms,
      nomClasse: e.nomClasse,
      notes: e.notes.filter((n) => !n.estPayee).map((n) => ({ noteId: n.noteId, typeGain: n.typeGain, montant: n.montant })),
    }));

  const columns: DataTableColumn<EleveMeritantRow>[] = [
    {
      key: "eleve",
      label: "Élève",
      render: (e) => (
        <span>
          <span className="font-semibold text-gray-900">{e.nom} {e.prenoms}</span>{" "}
          <span className="text-gray-400 font-mono text-xs block sm:inline">{e.matricule}</span>
        </span>
      ),
    },
    {
      key: "classe",
      label: "Classe & Site",
      render: (e) => (
        <span className="text-sm">
          <span className="font-medium text-gray-800">{e.nomClasse}</span>
          <span className="text-gray-400 text-xs block">{e.nomSite}</span>
        </span>
      ),
    },
    {
      key: "notes",
      label: "Détail notes",
      render: (e) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {e.notes.length} note(s)
          </span>
          <span className="text-xs text-gray-500 hidden md:inline">
            ({e.notes.filter((n) => n.typeGain === "devoir").length} dev., {e.notes.filter((n) => n.typeGain === "interro").length} int.)
          </span>
        </div>
      ),
    },
    {
      key: "montant",
      label: "Montant dû",
      render: (e) => <span className="font-bold text-gray-900">{e.totalDu.toLocaleString("fr-FR")} F</span>,
    },
    {
      key: "statut",
      label: "Statut",
      render: (e) => {
        if (e.statut === "paye") {
          return (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Payé
            </Badge>
          );
        }
        if (e.statut === "partiel") {
          return (
            <Badge variant="warning" className="gap-1">
              <Clock className="w-3 h-3" />
              Partiel ({e.totalRestant} F dû)
            </Badge>
          );
        }
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="w-3 h-3" />
            À payer
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (e) => (
        <div className="flex items-center gap-2">
          <DetailsRecompensesDialog
            eleveNom={e.nom}
            elevePrenoms={e.prenoms}
            nomClasse={e.nomClasse}
            mois={moisSelectionne}
            notes={e.notes}
          />
          {e.totalRestant > 0 && anneeSelectionnee && (
            <PayerRecompenseButton
              eleveId={e.eleveId}
              eleveNom={e.nom}
              elevePrenoms={e.prenoms}
              nomClasse={e.nomClasse}
              mois={moisSelectionne}
              anneeScolaireId={anneeSelectionnee.id}
              notesImpayees={e.notes.filter((n) => !n.estPayee).map((n) => ({ noteId: n.noteId, typeGain: n.typeGain, montant: n.montant }))}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Récompenses financières"
        subtitle={`Suivi mensuel et décaissement pour ${moisSelectionne}`}
        actions={
          anneeSelectionnee ? (
            <ToutPayerButton
              mois={moisSelectionne}
              anneeScolaireId={anneeSelectionnee.id}
              elevesImpayes={elevesPourToutPayer}
            />
          ) : undefined
        }
      />
      <RecompensesNav active="mensuel" />

      {/* Formulaire de filtres responsive */}
      <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <select
          name="annee_id"
          defaultValue={anneeSelectionnee?.id ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          {anneesList.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </select>

        <select
          name="mois"
          defaultValue={moisSelectionne}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-medium"
        >
          {MOIS_SCOLAIRES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          name="site_id"
          defaultValue={siteIdEffectif ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
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
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Toutes les classes</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>

        <select
          name="statut"
          defaultValue={searchParams.statut ?? "tous"}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="tous">Tous les statuts</option>
          <option value="a_payer">À payer</option>
          <option value="paye">Déjà payés</option>
        </select>

        <AutoSubmitOnChange />
      </form>

      {!anneeSelectionnee ? (
        <EmptyState icon={Trophy} title="Aucune année scolaire" description="Configurez une année scolaire pour consulter les récompenses." />
      ) : (
        <>
          {/* Cartes KPI responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={Users} label="Élèves méritants" value={totalElevesMeritants} />
            <KpiCard icon={Trophy} label="Montant total du mois" value={`${montantTotalMois.toLocaleString("fr-FR")} F`} />
            <KpiCard icon={CheckCircle2} label="Déjà versé" value={`${montantDejaVerse.toLocaleString("fr-FR")} F`} />
            <KpiCard icon={Clock} label="Reste à payer" value={`${montantResteAPayer.toLocaleString("fr-FR")} F`} />
          </div>

          <DataTable
            columns={columns}
            rows={elevesMeritants}
            rowKey={(e) => e.eleveId}
            emptyState={
              <EmptyState
                icon={Award}
                title="Aucun élève méritant ce mois-ci"
                description={`Aucune note méritante (Devoir ≥ 18/20 ou Interro Sciences = 20/20) enregistrée pour ${moisSelectionne}.`}
              />
            }
          />
        </>
      )}
    </div>
  );
}
