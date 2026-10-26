"use client";

import { Wallet, Clock, CheckCircle2, XCircle, MessageCircle, AlertCircle, History } from "lucide-react";
import { KpiCard } from "@/components/admin/KpiCard";
import { Badge } from "@/components/ui/badge";
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span>Historique de vos retraits</span>
            </h3>
            <p className="text-xs text-gray-500">
              Retrouvez l&apos;ensemble de vos règlements et leurs références officielles Mobile Money
            </p>
          </div>
        </div>

        {historiqueDemandes.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucun historique de retrait"
            description="Vos demandes de paiement apparaîtront ici au fur et à mesure de vos règlements."
          />
        ) : (
          <div className="space-y-2.5">
            {historiqueDemandes.map((d) => {
              const cfg = RESEAUX_MOMO[d.reseauMomo] ?? {
                label: d.reseauMomo,
                badgeClass: "bg-gray-100 text-gray-800",
              };

              const lienWhatsApp = genererLienReclamationPaiementWhatsApp({
                codeDemande: d.codeDemande,
                montant: d.montantDemande,
                nomProf: professeurNom,
                reseau: d.reseauMomo,
                numeroMomo: d.numeroMomo,
                statut: d.statut,
                referencePaiement: d.referencePaiement,
              });

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:border-gray-200 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        #{d.codeDemande}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {Number(d.montantDemande).toLocaleString("fr-FR")} F CFA
                      </span>

                      {d.statut === "en_attente" && (
                        <Badge variant="warning" className="gap-1 text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>En attente de versement</span>
                        </Badge>
                      )}
                      {d.statut === "paye" && (
                        <Badge variant="success" className="gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Payé</span>
                        </Badge>
                      )}
                      {d.statut === "rejete" && (
                        <Badge variant="danger" className="gap-1 text-[11px]">
                          <XCircle className="w-3 h-3" />
                          <span>Rejeté</span>
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                      </span>
                      <span>
                        Numéro : <strong className="text-gray-800 font-mono">{d.numeroMomo}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Demandé le{" "}
                        {new Date(d.dateDemande).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Preuve de paiement Mobile Money */}
                    {d.statut === "paye" && (
                      <div className="pt-1 flex items-center gap-2 text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex-wrap">
                        <span>
                          Réf. transaction :{" "}
                          <strong className="font-mono font-extrabold text-emerald-950">
                            {d.referencePaiement || "Enregistrée par GSR"}
                          </strong>
                        </span>
                        {d.datePaiement && (
                          <span className="text-emerald-700">
                            · Payé le{" "}
                            {new Date(d.datePaiement).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    )}

                    {d.statut === "rejete" && d.commentaireAdmin && (
                      <div className="pt-1 text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                        Motif : <strong>{d.commentaireAdmin}</strong>
                      </div>
                    )}
                  </div>

                  {/* Bouton d'action réclamation WhatsApp */}
                  <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <a
                      href={lienWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Contacter GSR sur WhatsApp au sujet de ce paiement"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Assistance WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
