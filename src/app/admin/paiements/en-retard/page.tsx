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

  const moisVisibles = moisVisiblesRetard(new Date());
  const moisFiltre = moisVisibles.includes(searchParams.mois as MoisScolaire) ? (searchParams.mois as MoisScolaire) : null;
  if (moisVisibles.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon={AlertTriangle}
          title="Rien à afficher avant le 16"
          description="Avant le 16 du mois, les retards du mois en cours ne sont pas encore affichés."
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
    .select("eleve_id, montant_paye, mois_souscription")
    .eq("annee_scolaire_id", anneeEnCours.id)
    .in("mois_souscription", moisVisibles);

  const paiementsParEleveMois = new Map<string, { montant_paye: number }[]>();
  for (const p of paiements ?? []) {
    const cle = `${p.eleve_id}-${p.mois_souscription}`;
    const liste = paiementsParEleveMois.get(cle) ?? [];
    liste.push({ montant_paye: p.montant_paye });
    paiementsParEleveMois.set(cle, liste);
  }

  const matricules = elevesActifs.map((e) => e.matricule);
  const { data: relances } = await supabase
    .from("log_whatsapp")
    .select("matricule, mois_souscription, date_envoi")
    .in("matricule", matricules)
    .order("date_envoi", { ascending: false });

  const derniereRelanceParEleveMois = new Map<string, string>();
  for (const r of relances ?? []) {
    const cle = `${r.matricule}-${r.mois_souscription}`;
    if (!derniereRelanceParEleveMois.has(cle)) derniereRelanceParEleveMois.set(cle, r.date_envoi);
  }

  const lignes: RetardRow[] = [];
  for (const eleve of elevesActifs) {
    const montantAttendu = montantParClasse.get(eleve.classe_id);
    if (montantAttendu === undefined) continue;

    for (const mois of moisFiltre ? [moisFiltre] : moisVisibles) {
      const paiementsMois = paiementsParEleveMois.get(`${eleve.id}-${mois}`) ?? [];
      const reste = resteAPayer(montantAttendu, paiementsMois);
      if (reste > 0) {
        lignes.push({
          eleve,
          mois,
          resteDu: reste,
          derniereRelance: derniereRelanceParEleveMois.get(`${eleve.matricule}-${mois}`) ?? null,
        });
      }
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
            defaultValue={moisFiltre ?? ""}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">Tous les mois</option>
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
