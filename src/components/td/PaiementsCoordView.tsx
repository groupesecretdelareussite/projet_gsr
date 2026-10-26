"use client";

import { useState, useMemo } from "react";
import { Search, Clock, CheckCircle2, XCircle, CreditCard, Filter, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { RESEAUX_MOMO, type ReseauMoMo } from "@/lib/td-finances";
import { ValiderPaiementTDDialog } from "@/components/td/ValiderPaiementTDDialog";

export interface DemandeRetraitCoordItem {
  id: number;
  codeDemande: string;
  professeurId: number;
  professeurNom: string;
  professeurTelephone: string;
  matiereNom: string;
  mois: string;
  montantDemande: number;
  reseauMomo: ReseauMoMo;
  numeroMomo: string;
  statut: "en_attente" | "paye" | "rejete";
  dateDemande: string;
  datePaiement?: string | null;
  referencePaiement?: string | null;
  payeParNom?: string | null;
  commentaireAdmin?: string | null;
}

interface PaiementsCoordViewProps {
  demandes: DemandeRetraitCoordItem[];
}

export function PaiementsCoordView({ demandes }: PaiementsCoordViewProps) {
  const [onglet, setOnglet] = useState<"en_attente" | "historique">("en_attente");
  const [recherche, setRecherche] = useState("");

  const enAttente = useMemo(
    () => demandes.filter((d) => d.statut === "en_attente"),
    [demandes]
  );
  const historique = useMemo(
    () => demandes.filter((d) => d.statut !== "en_attente"),
    [demandes]
  );

  const listeActive = onglet === "en_attente" ? enAttente : historique;

  // Filtrage par recherche universelle (code, nom, téléphone, réseau, référence MoMo)
  const listeFiltree = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return listeActive;

    return listeActive.filter((d) => {
      const matchCode = d.codeDemande.toLowerCase().includes(q);
      const matchNom = d.professeurNom.toLowerCase().includes(q);
      const matchTel = d.professeurTelephone.toLowerCase().includes(q);
      const matchMomo = d.numeroMomo.toLowerCase().includes(q);
      const matchRef = d.referencePaiement?.toLowerCase().includes(q);
      const matchMatiere = d.matiereNom.toLowerCase().includes(q);
      const matchMois = d.mois.toLowerCase().includes(q);

      return matchCode || matchNom || matchTel || matchMomo || matchRef || matchMatiere || matchMois;
    });
  }, [listeActive, recherche]);

  return (
    <div className="space-y-4">
      {/* Barre de contrôle : Onglets + Recherche universelle */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Onglets En attente / Historique */}
          <div className="flex items-center gap-2 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setOnglet("en_attente")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                onglet === "en_attente"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Demandes en attente</span>
              {enAttente.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
                  {enAttente.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setOnglet("historique")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                onglet === "historique"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Historique des règlements</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-gray-200 text-gray-700">
                {historique.length}
              </span>
            </button>
          </div>

          {/* Recherche universelle */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Rechercher par ID, Nom, Réf MoMo..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      {listeFiltree.length === 0 ? (
        <EmptyState
          icon={onglet === "en_attente" ? Clock : CreditCard}
          title={
            recherche
              ? "Aucun résultat trouvé"
              : onglet === "en_attente"
              ? "Aucune demande en attente"
              : "Aucun historique de règlement"
          }
          description={
            recherche
              ? `Aucune transaction ne correspond à "${recherche}".`
              : onglet === "en_attente"
              ? "Les demandes soumises par les professeurs entre le 28 et la fin du mois apparaîtront ici."
              : "Les règlements validés et archivés apparaîtront ici."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {listeFiltree.map((d) => {
            const configReseau = RESEAUX_MOMO[d.reseauMomo] ?? {
              label: d.reseauMomo,
              nomCourt: d.reseauMomo,
              badgeClass: "bg-gray-100 text-gray-800",
            };

            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:border-gray-200 transition"
              >
                {/* Informations professeur & demande */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      #{d.codeDemande}
                    </span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {d.professeurNom}
                    </span>
                    <span className="text-xs text-gray-400">· {d.matiereNom}</span>

                    {/* Statut Badge */}
                    {d.statut === "en_attente" && (
                      <Badge variant="warning" className="gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>En attente de virement</span>
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
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${configReseau.badgeClass}`}
                    >
                      {configReseau.label}
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
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Détails complémentaires pour l'historique */}
                  {d.statut === "paye" && (
                    <div className="pt-1 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/60 px-2.5 py-1 rounded-lg border border-emerald-100 flex-wrap">
                      <span>
                        Réf. MoMo : <strong className="font-mono font-bold">{d.referencePaiement}</strong>
                      </span>
                      {d.datePaiement && (
                        <span>
                          · Payé le{" "}
                          {new Date(d.datePaiement).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {d.commentaireAdmin && (
                        <span className="text-gray-600 italic">· &quot;{d.commentaireAdmin}&quot;</span>
                      )}
                    </div>
                  )}

                  {d.statut === "rejete" && d.commentaireAdmin && (
                    <div className="pt-1 text-xs text-red-700 bg-red-50/60 px-2.5 py-1 rounded-lg border border-red-100">
                      Motif du rejet : <strong>{d.commentaireAdmin}</strong>
                    </div>
                  )}
                </div>

                {/* Montant et Action */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-gray-400 font-medium">Montant</p>
                    <p className="text-lg font-extrabold text-primary">
                      {Number(d.montantDemande).toLocaleString("fr-FR")} F
                    </p>
                  </div>

                  {d.statut === "en_attente" && (
                    <ValiderPaiementTDDialog
                      demandeId={d.id}
                      codeDemande={d.codeDemande}
                      professeurNom={d.professeurNom}
                      professeurTelephone={d.professeurTelephone}
                      montant={d.montantDemande}
                      reseau={d.reseauMomo}
                      numeroMomo={d.numeroMomo}
                      dateDemande={d.dateDemande}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
