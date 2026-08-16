import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Wallet, NotebookText, ClipboardCheck, UserX, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuspendreDialog } from "@/components/admin/eleves/SuspendreDialog";
import { ReinscrireDialog } from "@/components/admin/eleves/ReinscrireDialog";
import { ReinitialiserMotDePasseParentDialog } from "@/components/admin/eleves/ReinitialiserMotDePasseParentDialog";
import { calculerMoyenneMatiere, calculerMoyenneGenerale, type NoteMatiere } from "@/lib/moyennes";
import { estVenuDansLeMois } from "@/lib/reinscription";
import { formaterNumeroAffichage } from "@/lib/telephone";
import { RAISON_LABELS, MODE_PAIEMENT_LABELS, type MoisScolaire } from "@/lib/constants";

const ROLES_ELEVES = ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"];
const ROLES_PAIEMENTS = ["coordonnateur", "comptable", "superviseur"];
const ROLES_NOTES_PRESENCES = ["coordonnateur", "comptable", "superviseur", "chef_site", "secretaire"];

function Bloc({ titre, action, children }: { titre: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-semibold text-gray-900">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function FicheElevePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);

  if (!ROLES_ELEVES.includes(scope.role)) {
    return (
      <div>
        <PageHeader title="Fiche élève" />
        <EmptyState icon={UserX} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  const peutGererSuspension = scope.role !== "chef_site" && scope.role !== "secretaire";
  const peutVoirContact = scope.role !== "chef_site" && scope.role !== "secretaire";

  const { data: eleve } = await supabase
    .from("eleves")
    .select(
      "id, matricule, nom, prenoms, contact_parent, contact_parent_2, college, option_m, statut, classe_id, classes(nom_classe, site_id, sites(nom_site))"
    )
    .eq("id", params.id)
    .single();

  if (!eleve) notFound();

  const classeInfo = eleve.classes as unknown as { nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;

  const [
    suspensionResult,
    paiementsResult,
    penalitesResult,
    moisExoneresResult,
    compteParentResult,
    matieresResult,
    coefficientsResult,
    anneeEnCoursResult,
  ] = await Promise.all([
    eleve.statut === "suspendu"
      ? supabase
          .from("eleves_suspendus")
          .select("raison, motif, montant_du, mois_souscription, date_suspension")
          .eq("eleve_id", eleve.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    ROLES_PAIEMENTS.includes(scope.role)
      ? supabase
          .from("paiements")
          .select("mois_souscription, montant_paye, date_paiement, mode_paiement")
          .eq("eleve_id", eleve.id)
          .order("date_paiement", { ascending: false })
      : Promise.resolve({ data: null }),
    ROLES_PAIEMENTS.includes(scope.role)
      ? supabase
          .from("penalites_reinscription")
          .select("montant, mode_paiement, date_paiement")
          .eq("eleve_id", eleve.id)
          .order("date_paiement", { ascending: false })
      : Promise.resolve({ data: null }),
    ROLES_PAIEMENTS.includes(scope.role)
      ? supabase
          .from("mois_exoneres")
          .select("mois_souscription, date_exoneration")
          .eq("eleve_id", eleve.id)
          .order("date_exoneration", { ascending: false })
      : Promise.resolve({ data: null }),
    scope.role === "coordonnateur"
      ? supabase.from("comptes_parents").select("matricule").eq("matricule", eleve.matricule).maybeSingle()
      : Promise.resolve({ data: null }),
    ROLES_NOTES_PRESENCES.includes(scope.role)
      ? supabase.from("matieres").select("id, nom").eq("actif", true).order("ordre")
      : Promise.resolve({ data: null }),
    ROLES_NOTES_PRESENCES.includes(scope.role)
      ? supabase.from("coefficients").select("matiere_id, coefficient").eq("classe_id", eleve.classe_id)
      : Promise.resolve({ data: null }),
    ROLES_NOTES_PRESENCES.includes(scope.role)
      ? supabase.from("annees_scolaires").select("id, date_debut").eq("statut", "en_cours").maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const suspension = suspensionResult.data as {
    raison: string;
    motif: string;
    montant_du: number;
    mois_souscription: string | null;
    date_suspension: string;
  } | null;
  const paiements = (paiementsResult.data ?? []) as { mois_souscription: string; montant_paye: number; date_paiement: string; mode_paiement: string }[];
  const penalites = (penalitesResult.data ?? []) as { montant: number; mode_paiement: string; date_paiement: string }[];
  const moisExoneresListe = (moisExoneresResult.data ?? []) as { mois_souscription: string; date_exoneration: string }[];
  const aUnCompteParent = !!compteParentResult.data;
  const anneeEnCours = anneeEnCoursResult.data as { id: number; date_debut: string } | null;

  let estVenuDansLeMoisSuspendu: boolean | null = null;
  if (suspension?.raison === "defaut_paiement" && suspension.montant_du > 0 && suspension.mois_souscription && anneeEnCours) {
    estVenuDansLeMoisSuspendu = await estVenuDansLeMois(
      supabase,
      eleve.id,
      suspension.mois_souscription as MoisScolaire,
      anneeEnCours.date_debut
    );
  }

  interface LigneHistoriquePaiement {
    key: string;
    libelle: string;
    montant: number | null;
    mode: string | null;
    date: string;
  }

  const historiquePaiements: LigneHistoriquePaiement[] = [
    ...paiements.map((p, i) => ({
      key: `paiement-${i}`,
      libelle: p.mois_souscription,
      montant: p.montant_paye,
      mode: p.mode_paiement,
      date: p.date_paiement,
    })),
    ...moisExoneresListe.map((m, i) => ({
      key: `exonere-${i}`,
      libelle: `${m.mois_souscription} — Exonéré (absence)`,
      montant: null,
      mode: null,
      date: m.date_exoneration,
    })),
    ...penalites.map((p, i) => ({
      key: `penalite-${i}`,
      libelle: "Pénalité de réinscription",
      montant: p.montant,
      mode: p.mode_paiement,
      date: p.date_paiement,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  let moyenneGeneraleAffichage: string | null = null;
  let matieresMoyennes: { nom: string; coefficient: number | null; moyenne: number | null }[] = [];
  let presencesResume: { total: number; presents: number } | null = null;

  if (ROLES_NOTES_PRESENCES.includes(scope.role) && anneeEnCours) {
    const matieres = (matieresResult.data ?? []) as { id: number; nom: string }[];
    const coefficientParMatiere = new Map(
      ((coefficientsResult.data ?? []) as { matiere_id: number; coefficient: number }[]).map((c) => [c.matiere_id, Number(c.coefficient)])
    );

    const { data: notesData } = await supabase
      .from("notes")
      .select("matiere_id, type_note, valeur")
      .eq("eleve_id", eleve.id)
      .eq("annee_scolaire_id", anneeEnCours.id);

    const notesParMatiere = new Map<number, NoteMatiere[]>();
    for (const n of notesData ?? []) {
      const liste = notesParMatiere.get(n.matiere_id) ?? [];
      liste.push({ type_note: n.type_note, valeur: Number(n.valeur) });
      notesParMatiere.set(n.matiere_id, liste);
    }

    const matieresEvaluees = matieres.map((m) => ({
      matiereId: m.id,
      resultat: calculerMoyenneMatiere(notesParMatiere.get(m.id) ?? [], coefficientParMatiere.get(m.id) ?? null),
    }));

    matieresMoyennes = matieres.map((m, i) => ({
      nom: m.nom,
      coefficient: coefficientParMatiere.get(m.id) ?? null,
      moyenne: matieresEvaluees[i].resultat.moyenneMatiere,
    }));

    const { moyenneGenerale } = calculerMoyenneGenerale(matieresEvaluees);
    moyenneGeneraleAffichage = moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : null;

    const { data: presencesData } = await supabase
      .from("presences")
      .select("present")
      .eq("eleve_id", eleve.id)
      .eq("annee_scolaire_id", anneeEnCours.id);
    const total = presencesData?.length ?? 0;
    const presents = (presencesData ?? []).filter((p) => p.present).length;
    presencesResume = { total, presents };
  }

  const colonnesNotes: DataTableColumn<{ nom: string; coefficient: number | null; moyenne: number | null }>[] = [
    {
      key: "matiere",
      label: "Matière",
      render: (m) => (
        <span className="flex items-center gap-1.5">
          <NotebookText className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          {m.nom}
          {m.coefficient === null && <span className="text-xs text-orange-600">(coef. absent)</span>}
        </span>
      ),
    },
    { key: "moyenne", label: "Moyenne", render: (m) => <span className="font-medium text-gray-800">{m.moyenne !== null ? m.moyenne.toFixed(2) : "—"}</span> },
  ];

  const colonnesPaiements: DataTableColumn<LigneHistoriquePaiement>[] = [
    {
      key: "libelle",
      label: "Mois / Libellé",
      render: (l) => (
        <span className={`flex items-center gap-1.5 ${l.montant === null ? "text-gray-400 italic" : "text-gray-700"}`}>
          <Wallet className="w-3.5 h-3.5 text-gray-300 shrink-0" />
          {l.libelle}
        </span>
      ),
    },
    {
      key: "montant",
      label: "Montant",
      render: (l) => <span className={l.montant === null ? "text-gray-400 italic" : "text-gray-700"}>{l.montant === null ? "Exonéré" : `${l.montant} F`}</span>,
    },
    { key: "mode", label: "Mode", render: (l) => (l.mode ? MODE_PAIEMENT_LABELS[l.mode as keyof typeof MODE_PAIEMENT_LABELS] : "—") },
    { key: "date", label: "Date", render: (l) => new Date(l.date).toLocaleDateString("fr-FR") },
  ];

  return (
    <div>
      <PageHeader
        title={`${eleve.nom} ${eleve.prenoms}`}
        subtitle={`${eleve.matricule} — ${classeInfo?.nom_classe ?? "—"} — ${classeInfo?.sites?.nom_site ?? "—"}`}
        actions={
          <Link href={`/admin/eleves/${eleve.id}/modifier`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <Bloc titre="Identité">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between sm:block">
              <dt className="text-gray-400">Statut</dt>
              <dd>
                <Badge variant={eleve.statut === "actif" ? "success" : "danger"}>
                  {eleve.statut === "actif" ? "Actif" : "Suspendu"}
                </Badge>
              </dd>
            </div>
            {peutVoirContact && (
              <>
                <div className="flex justify-between sm:block">
                  <dt className="text-gray-400">Contact parent (WhatsApp)</dt>
                  <dd className="text-gray-700">{formaterNumeroAffichage(eleve.contact_parent)}</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-gray-400">Contact parent 2</dt>
                  <dd className="text-gray-700">{formaterNumeroAffichage(eleve.contact_parent_2)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between sm:block">
              <dt className="text-gray-400">Collège</dt>
              <dd className="text-gray-700">{eleve.college || "—"}</dd>
            </div>
            <div className="flex justify-between sm:block">
              <dt className="text-gray-400">Option</dt>
              <dd className="text-gray-700">{eleve.option_m || "—"}</dd>
            </div>
          </dl>
        </Bloc>

        {eleve.statut === "suspendu" && suspension && (
          <Bloc
            titre="Suspension en cours"
            action={
              peutGererSuspension && (
                <ReinscrireDialog
                  eleveId={eleve.id}
                  nomComplet={`${eleve.nom} ${eleve.prenoms}`}
                  raison={suspension.raison}
                  montantDu={suspension.montant_du}
                  moisSouscription={suspension.mois_souscription}
                  estVenuDansLeMois={estVenuDansLeMoisSuspendu}
                />
              )
            }
          >
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm mb-2">
              <div>
                <dt className="text-gray-400">Raison</dt>
                <dd><Badge variant="warning">{RAISON_LABELS[suspension.raison as keyof typeof RAISON_LABELS]}</Badge></dd>
              </div>
              <div>
                <dt className="text-gray-400">Montant dû</dt>
                <dd className={suspension.montant_du > 0 ? "text-red-600 font-semibold" : "text-gray-700"}>
                  {estVenuDansLeMoisSuspendu === false ? (
                    <span className="text-gray-400 italic font-normal">Sera exonéré (absence)</span>
                  ) : (
                    `${suspension.montant_du} F`
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Depuis le</dt>
                <dd className="text-gray-700">{new Date(suspension.date_suspension).toLocaleDateString("fr-FR")}</dd>
              </div>
            </dl>
            <p className="text-sm text-gray-600">{suspension.motif}</p>
          </Bloc>
        )}

        {eleve.statut === "actif" && peutGererSuspension && (
          <Bloc titre="Suspension" action={<SuspendreDialog eleveId={eleve.id} nomComplet={`${eleve.nom} ${eleve.prenoms}`} />}>
            <p className="text-sm text-gray-500">Aucune suspension en cours.</p>
          </Bloc>
        )}

        {ROLES_NOTES_PRESENCES.includes(scope.role) && (
          <Bloc titre="Notes" action={<Link href="/admin/notes" className="text-xs text-primary-dark font-medium hover:underline">Saisir des notes</Link>}>
            {!anneeEnCours ? (
              <p className="text-sm text-gray-500">Aucune année scolaire en cours.</p>
            ) : (
              <>
                <DataTable bare columns={colonnesNotes} rows={matieresMoyennes} rowKey={(m) => m.nom} />
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Moyenne générale</span>
                  <span className="text-lg font-bold text-primary">{moyenneGeneraleAffichage ?? "—"}</span>
                </div>
              </>
            )}
          </Bloc>
        )}

        {ROLES_NOTES_PRESENCES.includes(scope.role) && (
          <Bloc titre="Présences" action={<Link href="/admin/presences" className="text-xs text-primary-dark font-medium hover:underline">Feuille de présence</Link>}>
            {!anneeEnCours || !presencesResume ? (
              <p className="text-sm text-gray-500">Aucune année scolaire en cours.</p>
            ) : presencesResume.total === 0 ? (
              <p className="text-sm text-gray-500">Aucun pointage enregistré pour l&apos;instant.</p>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-gray-700">
                  <strong>{presencesResume.presents}</strong> / {presencesResume.total} jours présents
                </span>
                <Badge variant={presencesResume.presents / presencesResume.total >= 0.75 ? "success" : "warning"}>
                  {Math.round((presencesResume.presents / presencesResume.total) * 100)}%
                </Badge>
              </div>
            )}
          </Bloc>
        )}

        {ROLES_PAIEMENTS.includes(scope.role) && (
          <Bloc titre="Paiements" action={<Link href="/admin/paiements/enregistrer" className="text-xs text-primary-dark font-medium hover:underline">Enregistrer un paiement</Link>}>
            {historiquePaiements.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun paiement enregistré.</p>
            ) : (
              <DataTable bare columns={colonnesPaiements} rows={historiquePaiements} rowKey={(l) => l.key} />
            )}
          </Bloc>
        )}

        {scope.role === "coordonnateur" && (
          <Bloc
            titre="Compte parent"
            action={
              aUnCompteParent && (
                <ReinitialiserMotDePasseParentDialog matricule={eleve.matricule} nomComplet={`${eleve.nom} ${eleve.prenoms}`} />
              )
            }
          >
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-gray-300" />
              {aUnCompteParent ? "Un compte parent existe pour cet élève." : "Aucun compte parent créé pour l'instant."}
            </p>
          </Bloc>
        )}
      </div>
    </div>
  );
}
