import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { moisCourant, resteAPayer, genererNumeroQuittance } from "@/lib/paiements";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExporterExcelButton } from "@/components/admin/ExporterExcelButton";
import { AJourTable, type EleveAJourItem } from "@/components/admin/paiements/AJourTable";
import { AutoSubmitOnChange } from "@/components/admin/AutoSubmitOnChange";
import { lireFiltreSiteSuperviseur } from "@/lib/site-filter-cookie";

interface EleveRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  college: string | null;
  classe_id: number;
  classes: { nom_classe: string; site_id: number; sites: { nom_site: string } | null } | null;
}

interface PaiementVersementRow {
  id: number;
  eleve_id: number;
  montant_paye: number;
  date_paiement: string;
  mode_paiement: string;
}

export default async function PaiementsAJourPage(props: {
  searchParams: Promise<{ site_id?: string; classe_id?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const mois = moisCourant(new Date());

  const header = (
    <div>
      <PageHeader title="Paiements à jour" subtitle={mois ? `Mois de ${mois}` : "Hors période scolaire"} />
      <PaiementsNav active="a-jour" role={scope.role} />
    </div>
  );

  // §discussion 2026-08-16 — chef_site en lecture seule, pas secretaire (cf. PaiementsNav).
  if (!["coordonnateur", "comptable", "superviseur", "chef_site"].includes(scope.role)) {
    return (
      <div>
        {header}
        <EmptyState icon={CheckCircle2} title="Non autorisé" description="Cette page ne vous est pas accessible." />
      </div>
    );
  }

  if (!mois) {
    return (
      <div>
        {header}
        <EmptyState
          icon={CheckCircle2}
          title="Aucune année scolaire active"
          description="Nous sommes hors période scolaire (juin à septembre) — aucun suivi mensuel à afficher."
        />
      </div>
    );
  }

  const [{ data: anneeEnCours }, { data: sites }, { data: classes }] = await Promise.all([
    supabase.from("annees_scolaires").select("id, libelle").eq("statut", "en_cours").maybeSingle(),
    supabase.from("sites").select("id, nom_site").order("nom_site"),
    supabase.from("classes").select("id, nom_classe, site_id").order("ordre"),
  ]);

  if (!anneeEnCours) {
    return (
      <div>
        {header}
        <EmptyState icon={CheckCircle2} title="Aucune année scolaire active" description="Aucune année scolaire en cours." />
      </div>
    );
  }

  const estChefSiteOuSecretaire = scope.role === "chef_site" || scope.role === "secretaire";
  const siteIdEffectif = estChefSiteOuSecretaire
    ? scope.siteId?.toString()
    : searchParams.site_id !== undefined
      ? searchParams.site_id || undefined
      : scope.role === "superviseur"
        ? (await lireFiltreSiteSuperviseur())?.toString()
        : undefined;

  const nomSiteParId = new Map((sites ?? []).map((s) => [s.id, s.nom_site]));
  const classesFiltrees = siteIdEffectif
    ? (classes ?? []).filter((c) => String(c.site_id) === siteIdEffectif)
    : classes ?? [];

  const classeIdValide =
    searchParams.classe_id && classesFiltrees.some((c) => String(c.id) === searchParams.classe_id)
      ? searchParams.classe_id
      : undefined;

  let elevesQuery = supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, college, classe_id, classes!inner(nom_classe, site_id, sites(nom_site))")
    .eq("statut", "actif")
    .order("nom");

  if (siteIdEffectif) elevesQuery = elevesQuery.eq("classes.site_id", siteIdEffectif);
  if (classeIdValide) elevesQuery = elevesQuery.eq("classe_id", classeIdValide);

  const { data: eleves } = await elevesQuery;
  const elevesActifs = (eleves ?? []) as unknown as EleveRow[];

  const { data: fraisTd } = await supabase.from("frais_td").select("classe_id, montant");
  const montantParClasse = new Map((fraisTd ?? []).map((f) => [f.classe_id, Number(f.montant)]));

  const { data: paiements } = await supabase
    .from("paiements")
    .select("id, eleve_id, montant_paye, date_paiement, mode_paiement")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("mois_souscription", mois);

  const paiementsParEleve = new Map<number, PaiementVersementRow[]>();
  for (const p of (paiements ?? []) as unknown as PaiementVersementRow[]) {
    const liste = paiementsParEleve.get(p.eleve_id) ?? [];
    liste.push({
      id: p.id,
      eleve_id: p.eleve_id,
      montant_paye: Number(p.montant_paye),
      date_paiement: p.date_paiement,
      mode_paiement: p.mode_paiement,
    });
    paiementsParEleve.set(p.eleve_id, liste);
  }

  const elevesAJour = elevesActifs.filter((e) => {
    const montantAttendu = montantParClasse.get(e.classe_id);
    if (montantAttendu === undefined) return false;
    return resteAPayer(montantAttendu, paiementsParEleve.get(e.id) ?? []) === 0;
  });

  const anneeLibelle = anneeEnCours.libelle ?? "2025-2026";
  const itemsAJour: EleveAJourItem[] = elevesAJour.map((e) => {
    const versements = (paiementsParEleve.get(e.id) ?? []).sort((a, b) =>
      a.date_paiement.localeCompare(b.date_paiement)
    );
    const lastId = versements[versements.length - 1]?.id ?? 1;
    const numeroQuittance = genererNumeroQuittance(anneeLibelle, mois, lastId);
    const montantAttendu = montantParClasse.get(e.classe_id) ?? 0;

    return {
      id: e.id,
      matricule: e.matricule,
      nom: e.nom,
      prenoms: e.prenoms,
      nomClasse: e.classes?.nom_classe ?? "—",
      nomSite: e.classes?.sites?.nom_site ?? "—",
      quittance: {
        numeroQuittance,
        nomComplet: `${e.nom} ${e.prenoms}`,
        matricule: e.matricule,
        college: e.college ?? "",
        nomClasse: e.classes?.nom_classe ?? "—",
        nomSite: e.classes?.sites?.nom_site ?? "—",
        mois,
        anneeScolaire: anneeLibelle,
        montantAttendu,
        versements: versements.map((v) => ({
          id: v.id,
          datePaiement: v.date_paiement,
          montantPaye: v.montant_paye,
          modePaiement: v.mode_paiement,
        })),
      },
    };
  });

  const peutExporter = ["coordonnateur", "comptable", "superviseur"].includes(scope.role);
  const nomSiteTitre = siteIdEffectif ? nomSiteParId.get(Number(siteIdEffectif)) ?? "Site inconnu" : "Tous les sites";
  const classeSelectionnee = classesFiltrees.find((c) => String(c.id) === classeIdValide);
  const classeTitre = classeSelectionnee ? classeSelectionnee.nom_classe : "Toutes les classes";
  const dateExport = new Date().toLocaleDateString("fr-FR");
  const lignesExport = elevesAJour.map((e) => ({
    Matricule: e.matricule,
    Nom: e.nom,
    Prénoms: e.prenoms,
    Classe: e.classes?.nom_classe ?? "—",
    Site: e.classes?.sites?.nom_site ?? "—",
  }));

  return (
    <div>
      <PageHeader
        title="Paiements à jour"
        subtitle={`Mois de ${mois}`}
        actions={
          peutExporter ? (
            <ExporterExcelButton
              titre={`Paiements à jour — Mois de ${mois} — ${nomSiteTitre} — ${classeTitre} — ${dateExport}`}
              lignes={lignesExport}
              nomFichier={`Paiements_a_jour_${mois}_${nomSiteTitre}_${classeTitre}_${dateExport}`.replace(/\s+/g, "_")}
              nomFeuille="À jour"
            />
          ) : undefined
        }
      />
      <PaiementsNav active="a-jour" role={scope.role} />

      <form method="get" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 max-w-xl">
        {!estChefSiteOuSecretaire && (
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
        )}
        <select
          name="classe_id"
          defaultValue={classeIdValide ?? ""}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Toutes les classes</option>
          {classesFiltrees.map((c) => (
            <option key={c.id} value={c.id}>
              {siteIdEffectif ? c.nom_classe : `${c.nom_classe} — ${nomSiteParId.get(c.site_id) ?? "?"}`}
            </option>
          ))}
        </select>
        <AutoSubmitOnChange />
      </form>

      <AJourTable rows={itemsAJour} mois={mois} />
    </div>
  );
}
