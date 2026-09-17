import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { moisCourant, resteAPayer, genererNumeroQuittance } from "@/lib/paiements";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExporterExcelButton } from "@/components/admin/ExporterExcelButton";
import { AJourTable, type EleveAJourItem } from "@/components/admin/paiements/AJourTable";

interface EleveRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  college: string | null;
  classe_id: number;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

interface PaiementVersementRow {
  id: number;
  eleve_id: number;
  montant_paye: number;
  date_paiement: string;
  mode_paiement: string;
}

export default async function PaiementsAJourPage() {
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

  const { data: anneeEnCours } = await supabase
    .from("annees_scolaires")
    .select("id, libelle")
    .eq("statut", "en_cours")
    .maybeSingle();

  const { data: eleves } = await supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, college, classe_id, classes(nom_classe, sites(nom_site))")
    .eq("statut", "actif")
    .order("nom");

  const elevesActifs = (eleves ?? []) as unknown as EleveRow[];

  if (!anneeEnCours || elevesActifs.length === 0) {
    return (
      <div>
        {header}
        <EmptyState icon={CheckCircle2} title="Aucun élève" description="Aucun élève actif à afficher." />
      </div>
    );
  }

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
              titre={`Paiements à jour — Mois de ${mois} — ${dateExport}`}
              lignes={lignesExport}
              nomFichier={`Paiements_a_jour_${mois}_${dateExport}`.replace(/\s+/g, "_")}
              nomFeuille="À jour"
            />
          ) : undefined
        }
      />
      <PaiementsNav active="a-jour" role={scope.role} />
      <AJourTable rows={itemsAJour} mois={mois} />
    </div>
  );
}
