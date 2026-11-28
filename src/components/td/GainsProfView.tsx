"use client";

import Image from "next/image";
import { Wallet, Clock, CheckCircle2, MessageCircle } from "lucide-react";
import { KpiCard } from "@/components/admin/KpiCard";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  RESEAUX_MOMO,
  type StatutFenetreRetrait,
  genererLienReclamationPaiementWhatsApp,
} from "@/lib/td-finances";
import {
  DemandeRetraitProfForm,
  type DemandeRetraitProfItem,
} from "@/components/td/DemandeRetraitProfForm";

const STATUTS_RETRAIT: Record<
  DemandeRetraitProfItem["statut"],
  { libelle: string; point: string; texte: string }
> = {
  en_attente: { libelle: "En attente", point: "bg-amber-500", texte: "text-amber-700" },
  paye: { libelle: "Payé", point: "bg-emerald-500", texte: "text-emerald-700" },
  rejete: { libelle: "Rejeté", point: "bg-red-500", texte: "text-red-700" },
};

/** "2026-11" → "novembre 2026" (repli sur la date de demande si le format est inattendu). */
function libelleMoisRetrait(mois: string, dateDemande: string): string {
  const [annee, numeroMois] = mois.split("-").map(Number);
  const date =
    annee && numeroMois ? new Date(annee, numeroMois - 1, 1) : new Date(dateDemande);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

interface GainsProfViewProps {
  soldeDisponible: number;
  totalGainsClotures: number;
  totalRetraitsPayes: number;
  montantEnAttente: number;
  telephoneProfil: string;
  professeurNom: string;
  historiqueDemandes: DemandeRetraitProfItem[];
  demandeDuMois?: DemandeRetraitProfItem | null;
  statutFenetre: StatutFenetreRetrait;
}

export function GainsProfView({
  soldeDisponible,
  totalGainsClotures,
  totalRetraitsPayes,
  montantEnAttente,
  telephoneProfil,
  professeurNom,
  historiqueDemandes,
  demandeDuMois,
  statutFenetre,
}: GainsProfViewProps) {
  return (
    <div className="space-y-6">
      {/* ── Cartes de Solde & KPI ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Wallet}
          label="Solde disponible"
          value={`${soldeDisponible.toLocaleString("fr-FR")} F`}
        />
        <KpiCard
          icon={Clock}
          label="En cours de versement"
          value={`${montantEnAttente.toLocaleString("fr-FR")} F`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Total cumulé perçu"
          value={`${totalRetraitsPayes.toLocaleString("fr-FR")} F`}
        />
      </div>

      {/* ── Bloc de Retrait Mensuel (28 au dernier jour du mois) ── */}
      <DemandeRetraitProfForm
        soldeDisponible={soldeDisponible}
        telephoneProfil={telephoneProfil}
        professeurNom={professeurNom}
        demandeDuMois={demandeDuMois}
        statutFenetre={statutFenetre}
      />

      {/* ── Historique de tous les retraits ── */}
      <section className="space-y-3" aria-labelledby="titre-historique-retraits">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3
              id="titre-historique-retraits"
              className="font-bold text-gray-900 text-base sm:text-lg"
            >
              Historique de vos retraits
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Vos règlements et leurs références officielles Mobile Money
            </p>
          </div>
          {historiqueDemandes.length > 0 && (
            <span className="text-xs text-gray-500 tabular-nums shrink-0">
              {historiqueDemandes.length} demande{historiqueDemandes.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {historiqueDemandes.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun historique de retrait"
            description="Vos demandes de paiement apparaîtront ici au fur et à mesure de vos règlements."
          />
        ) : (
          <ul className="bg-white rounded-2xl border border-gray-100 shadow-xs divide-y divide-gray-100 overflow-hidden">
            {historiqueDemandes.map((d) => {
              const cfg = RESEAUX_MOMO[d.reseauMomo];
              const statut = STATUTS_RETRAIT[d.statut];

              const lienWhatsApp = genererLienReclamationPaiementWhatsApp({
                codeDemande: d.codeDemande,
                montant: d.montantDemande,
                nomProf: professeurNom,
                reseau: d.reseauMomo,
                numeroMomo: d.numeroMomo,
                statut: d.statut,
                referencePaiement: d.referencePaiement,
              });

              const dateDemande = new Date(d.dateDemande).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const datePaiement = d.datePaiement
                ? new Date(d.datePaiement).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <li key={d.id} className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  {/* Logo de l'opérateur */}
                  {cfg ? (
                    <Image
                      src={cfg.logo}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-lg object-contain shrink-0"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                      <Wallet className="w-4 h-4" />
                    </span>
                  )}

                  {/* Détail de la demande */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          Retrait de {libelleMoisRetrait(d.mois, d.dateDemande)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                          <span className="whitespace-nowrap">{cfg?.nomCourt ?? d.reseauMomo}</span>
                          <span className="hidden sm:inline text-gray-300" aria-hidden="true">·</span>
                          <span className="tabular-nums whitespace-nowrap">{d.numeroMomo}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm sm:text-base font-bold tabular-nums whitespace-nowrap ${
                            d.statut === "rejete" ? "text-gray-400 line-through" : "text-gray-900"
                          }`}
                        >
                          {Number(d.montantDemande).toLocaleString("fr-FR")} F
                        </p>
                        <p
                          className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium ${statut.texte}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statut.point}`} aria-hidden="true" />
                          {statut.libelle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-end justify-between gap-3">
                      <div className="min-w-0 space-y-0.5 text-[11px] sm:text-xs text-gray-500">
                        <p className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                          <span className="tabular-nums whitespace-nowrap">{d.codeDemande}</span>
                          <span className="hidden sm:inline text-gray-300" aria-hidden="true">·</span>
                          <span className="whitespace-nowrap">Demandé le {dateDemande}</span>
                        </p>

                        {d.statut === "paye" && (
                          <p className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                            <span className="break-all sm:break-normal">
                              Réf. opérateur{" "}
                              <span className="font-semibold text-gray-800 tabular-nums">
                                {d.referencePaiement || "enregistrée par GSR"}
                              </span>
                            </span>
                            {datePaiement && (
                              <>
                                <span className="hidden sm:inline text-gray-300" aria-hidden="true">·</span>
                                <span className="whitespace-nowrap">Versé le {datePaiement}</span>
                              </>
                            )}
                          </p>
                        )}

                        {d.statut === "rejete" && d.commentaireAdmin && (
                          <p className="text-red-700 break-words">Motif : {d.commentaireAdmin}</p>
                        )}
                      </div>

                      <a
                        href={lienWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contacter GSR sur WhatsApp au sujet de ce retrait"
                        className="inline-flex items-center gap-1.5 shrink-0 rounded-lg p-2 sm:px-2 sm:py-1 -mr-2 -mb-1.5 sm:-mb-1 text-xs font-medium text-gray-500 hover:text-emerald-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Assistance</span>
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
