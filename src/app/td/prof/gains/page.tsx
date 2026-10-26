import { redirect } from "next/navigation";
import { getTdProfesseurSession } from "@/lib/session-td";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { getStatutFenetreRetrait } from "@/lib/td-finances";
import { recupererSoldeEtGainsProfesseur } from "@/actions/td-paiements";
import { GainsProfView } from "@/components/td/GainsProfView";
import type { DemandeRetraitProfItem } from "@/components/td/DemandeRetraitProfForm";

export default async function GainsProfesseurPage() {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    redirect("/td/login");
  }

  const professeurId = session.professeurId;
  const supabaseAdmin = createServiceRoleClient();

  const [solde, { data: prof }, { data: demandes }] = await Promise.all([
    recupererSoldeEtGainsProfesseur(professeurId),
    supabaseAdmin
      .schema("td")
      .from("professeurs")
      .select("nom, prenom, telephone")
      .eq("id", professeurId)
      .maybeSingle(),
    supabaseAdmin
      .schema("td")
      .from("demandes_retrait")
      .select("*")
      .eq("professeur_id", professeurId)
      .order("date_demande", { ascending: false }),
  ]);

  const statutFenetre = getStatutFenetreRetrait();
  const nomComplet = prof ? `${prof.prenom} ${prof.nom}` : `${session.prenom ?? ""} ${session.nom ?? ""}`;
  const telephoneProfil = prof?.telephone ?? "";

  const historiqueDemandes: DemandeRetraitProfItem[] = (demandes ?? []).map((d) => ({
    id: d.id,
    codeDemande: d.code_demande,
    mois: d.mois,
    montantDemande: Number(d.montant_demande),
    reseauMomo: d.reseau_momo,
    numeroMomo: d.numero_momo,
    statut: d.statut,
    dateDemande: d.date_demande,
    datePaiement: d.date_paiement,
    referencePaiement: d.reference_paiement,
    commentaireAdmin: d.commentaire_admin,
  }));

  // Recherche de la demande relative au mois en cours
  const demandeDuMois =
    historiqueDemandes.find((d) => d.mois === statutFenetre.moisFormat) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes gains & Rémunérations"
        subtitle="Consultez votre solde en temps réel et demandez vos règlements Mobile Money chaque fin de mois"
      />

      <GainsProfView
        soldeDisponible={solde.soldeDisponible}
        totalGainsClotures={solde.totalGainsClotures}
        totalRetraitsPayes={solde.totalRetraitsPayes}
        montantEnAttente={solde.montantEnAttente}
        telephoneProfil={telephoneProfil}
        professeurNom={nomComplet}
        historiqueDemandes={historiqueDemandes}
        demandeDuMois={demandeDuMois}
        statutFenetre={statutFenetre}
      />
    </div>
  );
}
