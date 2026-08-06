import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { moisVisiblesRetard, resteAPayer } from "@/lib/paiements";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaiementsNav } from "@/components/admin/paiements/PaiementsNav";
import { EmptyState } from "@/components/admin/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { RelancerWhatsAppButton } from "@/components/admin/paiements/RelancerWhatsAppButton";
import { ACTIONS_HOVER_REVEAL } from "@/lib/utils";
import type { MoisScolaire } from "@/lib/constants";

interface EleveRow {
  id: number;
  matricule: string;
  nom: string;
  prenoms: string;
  classe_id: number;
  contact_parent: string;
  classes: { nom_classe: string; sites: { nom_site: string } | null } | null;
}

interface RetardRow {
  eleve: EleveRow;
  mois: MoisScolaire;
  resteDu: number;
  derniereRelance: string | null;
}

export default async function PaiementsEnRetardPage(props: { searchParams: Promise<{ mois?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const scope = await getUserScope(supabase);
  const peutVoirContact = scope.role !== "chef_site";

  const header = (
    <div>
      <PageHeader title="Paiements en retard" subtitle="Règle du 15 — le mois courant n'apparaît qu'à partir du 16" />
      <PaiementsNav active="en-retard" role={scope.role} />
    </div>
  );

  const { data: anneeEnCours } = await supabase
    .from("annees_scolaires")
    .select("id, date_debut, date_fin")
    .eq("statut", "en_cours")
    .single();

  const moisVisibles = moisVisiblesRetard(
    new Date(),
    anneeEnCours ? { dateDebut: anneeEnCours.date_debut, dateFin: anneeEnCours.date_fin } : null
  );
  const moisParDefaut = moisVisibles[moisVisibles.length - 1];
  const moisFiltre: MoisScolaire = moisVisibles.includes(searchParams.mois as MoisScolaire)
    ? (searchParams.mois as MoisScolaire)
    : moisParDefaut;
  if (moisVisibles.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon={AlertTriangle}
          title="Rien à afficher"
          description="Avant le 16 du mois (règle du 15), ou avant le début de l'année scolaire en cours, il n'y a rien à afficher."
        />
      </div>
    );
  }

  const { data: eleves } = await supabase
    .from("eleves")
    .select("id, matricule, nom, prenoms, classe_id, contact_parent, classes(nom_classe, sites(nom_site))")
    .eq("statut", "actif")
    .order("nom");

  const elevesActifs = (eleves ?? []) as unknown as EleveRow[];

  if (!anneeEnCours || elevesActifs.length === 0) {
    return (
      <div>
        {header}
        <EmptyState icon={AlertTriangle} title="Aucun retard" description="Aucun élève actif à afficher." />
      </div>
    );
  }

  const { data: fraisTd } = await supabase.from("frais_td").select("classe_id, montant");
  const montantParClasse = new Map((fraisTd ?? []).map((f) => [f.classe_id, Number(f.montant)]));

  const { data: paiements } = await supabase
    .from("paiements")
    .select("eleve_id, montant_paye")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("mois_souscription", moisFiltre);

  const paiementsParEleve = new Map<number, { montant_paye: number }[]>();
  for (const p of paiements ?? []) {
    const liste = paiementsParEleve.get(p.eleve_id) ?? [];
    liste.push({ montant_paye: p.montant_paye });
    paiementsParEleve.set(p.eleve_id, liste);
  }

  // Un mois exonéré (réinscription — absence totale durant le mois suspendu,
  // §013) n'est jamais réclamé : sans quoi il réapparaîtrait indéfiniment ici
  // une fois l'élève réinscrit, resteAPayer restant > 0 pour toujours.
  const { data: exonerations } = await supabase
    .from("mois_exoneres")
    .select("eleve_id")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .eq("mois_souscription", moisFiltre);
  const elevesExoneresCeMois = new Set((exonerations ?? []).map((e) => e.eleve_id));

  const matricules = elevesActifs.map((e) => e.matricule);
  const { data: relances } = await supabase
    .from("log_whatsapp")
    .select("matricule, date_envoi")
    .in("matricule", matricules)
    .eq("mois_souscription", moisFiltre)
    .order("date_envoi", { ascending: false });

  const derniereRelanceParEleve = new Map<string, string>();
  for (const r of relances ?? []) {
    if (!derniereRelanceParEleve.has(r.matricule)) derniereRelanceParEleve.set(r.matricule, r.date_envoi);
  }

  const lignes: RetardRow[] = [];
  for (const eleve of elevesActifs) {
    if (elevesExoneresCeMois.has(eleve.id)) continue;

    const montantAttendu = montantParClasse.get(eleve.classe_id);
    if (montantAttendu === undefined) continue;

    const paiementsMois = paiementsParEleve.get(eleve.id) ?? [];
    const reste = resteAPayer(montantAttendu, paiementsMois);
    if (reste > 0) {
      lignes.push({
        eleve,
        mois: moisFiltre,
        resteDu: reste,
        derniereRelance: derniereRelanceParEleve.get(eleve.matricule) ?? null,
      });
    }
  }

  const columns: DataTableColumn<RetardRow>[] = [
    {
      key: "eleve",
      label: "Élève",
      render: (l) => (
        <span>
          <span className="font-medium">{l.eleve.nom} {l.eleve.prenoms}</span>{" "}
          <span className="text-gray-400 font-mono text-xs">{l.eleve.matricule}</span>
        </span>
      ),
    },
    { key: "classe", label: "Classe", render: (l) => l.eleve.classes?.nom_classe ?? "—" },
    { key: "site", label: "Site", render: (l) => l.eleve.classes?.sites?.nom_site ?? "—" },
    { key: "mois", label: "Mois", render: (l) => l.mois },
    { key: "reste", label: "Reste dû", render: (l) => <span className="font-semibold text-red-600">{l.resteDu} F</span> },
    {
      key: "relance",
      label: "Dernière relance",
      render: (l) => (l.derniereRelance ? new Date(l.derniereRelance).toLocaleDateString("fr-FR") : "Jamais"),
    },
    ...(peutVoirContact
      ? [
          {
            key: "actions",
            label: "Actions",
            render: (l: RetardRow) => (
              <div className={ACTIONS_HOVER_REVEAL}>
                <RelancerWhatsAppButton
                  matricule={l.eleve.matricule}
                  nomComplet={`${l.eleve.nom} ${l.eleve.prenoms}`}
                  moisSouscription={l.mois}
                  montantRestant={l.resteDu}
                  contactParent={l.eleve.contact_parent}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {header}
      {moisVisibles.length > 1 && (
        <form method="get" className="flex items-center gap-2 mb-4">
          <select
            name="mois"
            defaultValue={moisFiltre}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {moisVisibles.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button type="submit" className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50">
            Filtrer
          </button>
        </form>
      )}
      <DataTable
        columns={columns}
        rows={lignes}
        rowKey={(l) => `${l.eleve.id}-${l.mois}`}
        emptyState={<EmptyState icon={AlertTriangle} title="Aucun retard" description="Tous les élèves sont à jour." />}
      />
    </div>
  );
}
