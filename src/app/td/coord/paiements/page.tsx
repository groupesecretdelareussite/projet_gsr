import { CreditCard, Clock, CheckCircle2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  PaiementsCoordView,
  type DemandeRetraitCoordItem,
} from "@/components/td/PaiementsCoordView";

interface DemandeRow {
  id: number;
  code_demande: string;
  professeur_id: number;
  mois: string;
  montant_demande: number;
  reseau_momo: "mtn" | "moov" | "celtis";
  numero_momo: string;
  statut: "en_attente" | "paye" | "rejete";
  date_demande: string;
  date_paiement?: string | null;
  reference_paiement?: string | null;
  commentaire_admin?: string | null;
}

export default async function PaiementsCoordPage() {
  await getUserScope(await createClient());
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: demandes }, { data: professeurs }, { data: matieres }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("demandes_retrait")
      .select("*")
      .order("date_demande", { ascending: false }),
    supabaseAdmin
      .schema("td")
      .from("professeurs")
      .select("id, nom, prenom, telephone, matiere_principale_id"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere"),
  ]);

  const matieresParId = new Map((matieres ?? []).map((m) => [m.id, m.nom_matiere]));
  const profsParId = new Map(
    (professeurs ?? []).map((p) => [
      p.id,
      {
        nomComplet: `${p.prenom} ${p.nom}`,
        telephone: p.telephone,
        matiereNom: matieresParId.get(p.matiere_principale_id) ?? "—",
      },
    ])
  );

  const listeDemandes = (demandes ?? []) as unknown as DemandeRow[];

  const demandesItems: DemandeRetraitCoordItem[] = listeDemandes.map((d) => {
    const prof = profsParId.get(d.professeur_id);
    return {
      id: d.id,
      codeDemande: d.code_demande,
      professeurId: d.professeur_id,
      professeurNom: prof?.nomComplet ?? "Professeur inconnu",
      professeurTelephone: prof?.telephone ?? "—",
      matiereNom: prof?.matiereNom ?? "—",
      mois: d.mois,
      montantDemande: Number(d.montant_demande),
      reseauMomo: d.reseau_momo,
      numeroMomo: d.numero_momo,
      statut: d.statut,
      dateDemande: d.date_demande,
      datePaiement: d.date_paiement,
      referencePaiement: d.reference_paiement,
      commentaireAdmin: d.commentaire_admin,
    };
  });

  // Calcul des métriques KPI
  const enAttente = demandesItems.filter((d) => d.statut === "en_attente");
  const montantEnAttente = enAttente.reduce((sum, d) => sum + d.montantDemande, 0);

  const moisCourant = new Date().toISOString().slice(0, 7);
  const payesCeMois = demandesItems.filter(
    (d) => d.statut === "paye" && (d.datePaiement?.slice(0, 7) === moisCourant || d.mois === moisCourant)
  );
  const montantPayeCeMois = payesCeMois.reduce((sum, d) => sum + d.montantDemande, 0);

  const totalPayeTousMois = demandesItems
    .filter((d) => d.statut === "paye")
    .reduce((sum, d) => sum + d.montantDemande, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements des professeurs"
        subtitle="Gestion des demandes de retrait mensuelles et suivi des versements Mobile Money"
      />

      {/* Cartes KPI */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Clock}
          label="Demandes en attente"
          value={`${enAttente.length} (${montantEnAttente.toLocaleString("fr-FR")} F)`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Règlements de ce mois"
          value={`${montantPayeCeMois.toLocaleString("fr-FR")} F`}
        />
        <KpiCard
          icon={Wallet}
          label="Total cumulé déboursé"
          value={`${totalPayeTousMois.toLocaleString("fr-FR")} F`}
        />
      </div>

      {/* Vue interactive avec recherche et onglets */}
      <PaiementsCoordView demandes={demandesItems} />
    </div>
  );
}
