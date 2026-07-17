import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { moisCourant, resteAPayer } from "@/lib/paiements";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";

interface EleveRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classe_id: number;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

export default async function PaiementsAJourPage() {
  const supabase = createClient();
  const scope = await getUserScope(supabase);
  const mois = moisCourant(new Date());

  const header = (
    <div>
      <PageHeader title="Paiements à jour" subtitle={mois ? `Mois de ${mois}` : "Hors période scolaire"} />
      <PaiementsNav active="a-jour" role={scope.role} />
    </div>
  );

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
    .select("id")
    .eq("statut", "en_cours")
    .single();

  const { data: eleves } = await supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, classe_id, classes(nom_classe, sites(nom_site))")
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
    .select("eleve_id, montant_paye")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("mois_souscription", mois);

  const paiementsParEleve = new Map<number, { montant_paye: number }[]>();
  for (const p of paiements ?? []) {
    const liste = paiementsParEleve.get(p.eleve_id) ?? [];
    liste.push({ montant_paye: p.montant_paye });
    paiementsParEleve.set(p.eleve_id, liste);
  }

  const elevesAJour = elevesActifs.filter((e) => {
    const montantAttendu = montantParClasse.get(e.classe_id);
    if (montantAttendu === undefined) return false;
    return resteAPayer(montantAttendu, paiementsParEleve.get(e.id) ?? []) === 0;
  });

  const columns: DataTableColumn<EleveRow>[] = [
    { key: "matricule", label: "Matricule", render: (e) => <span className="font-mono text-xs">{e.matricule}</span> },
    { key: "nom", label: "Nom", render: (e) => <span className="font-medium">{e.nom}</span> },
    { key: "prenoms", label: "Prénoms", render: (e) => e.prenoms },
    { key: "classe", label: "Classe", render: (e) => e.classes?.nom_classe ?? "—" },
    { key: "site", label: "Site", render: (e) => e.classes?.sites?.nom_site ?? "—" },
  ];

  return (
    <div>
      {header}
      <DataTable
        columns={columns}
        rows={elevesAJour}
        rowKey={(e) => e.id}
        emptyState={
          <EmptyState icon={CheckCircle2} title="Aucun élève à jour" description={`Aucun élève n'a soldé le mois de ${mois}.`} />
        }
      />
    </div>
  );
}
