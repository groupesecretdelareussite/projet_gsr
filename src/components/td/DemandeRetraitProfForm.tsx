"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RESEAUX_MOMO,
  MONTANT_MINIMUM_RETRAIT,
  type ReseauMoMo,
  type StatutFenetreRetrait,
  genererLienReclamationPaiementWhatsApp,
} from "@/lib/td-finances";
import { demanderRetraitProfTD } from "@/actions/td-paiements";

export interface DemandeRetraitProfItem {
  id: number;
  codeDemande: string;
  mois: string;
  montantDemande: number;
  reseauMomo: ReseauMoMo;
  numeroMomo: string;
  statut: "en_attente" | "paye" | "rejete";
  dateDemande: string;
  datePaiement?: string | null;
  referencePaiement?: string | null;
  commentaireAdmin?: string | null;
}

interface DemandeRetraitProfFormProps {
  soldeDisponible: number;
  telephoneProfil: string;
  professeurNom: string;
  demandeDuMois?: DemandeRetraitProfItem | null;
  statutFenetre: StatutFenetreRetrait;
}

export function DemandeRetraitProfForm({
  soldeDisponible,
  telephoneProfil,
  professeurNom,
  demandeDuMois,
  statutFenetre,
}: DemandeRetraitProfFormProps) {
  const router = useRouter();
  const [montant, setMontant] = useState<string>("");
  const [reseau, setReseau] = useState<ReseauMoMo>("mtn");
  const [numeroMomo, setNumeroMomo] = useState<string>(telephoneProfil || "");
  const [isPending, startTransition] = useTransition();

  // 1. Fenêtre fermée (du 1er au 27 du mois)
  if (!statutFenetre.estOuverte) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              Période de retrait mensuelle fermée
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Les demandes de paiement s&apos;effectuent chaque fin de mois,{" "}
              <strong>du 28 au dernier jour du mois</strong>. Vos gains continuent de s&apos;accumuler
              automatiquement au fil de vos séances de TD clôturées.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <Clock className="w-4 h-4" />
              <span>Prochaine ouverture : le {statutFenetre.prochaineOuvertureLibelle} à 00h00</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fenêtre ouverte : une demande est déjà active ou payée pour ce mois
  if (demandeDuMois && demandeDuMois.statut !== "rejete") {
    const configReseau = RESEAUX_MOMO[demandeDuMois.reseauMomo] ?? {
      label: demandeDuMois.reseauMomo,
      badgeClass: "bg-gray-100 text-gray-800",
    };

    const lienWhatsApp = genererLienReclamationPaiementWhatsApp({
      codeDemande: demandeDuMois.codeDemande,
      montant: demandeDuMois.montantDemande,
      nomProf: professeurNom,
      reseau: demandeDuMois.reseauMomo,
      numeroMomo: demandeDuMois.numeroMomo,
      statut: demandeDuMois.statut,
      referencePaiement: demandeDuMois.referencePaiement,
    });

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Demande du mois en cours
            </span>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              Dossier #{demandeDuMois.codeDemande}
            </h3>
          </div>

          {demandeDuMois.statut === "en_attente" && (
            <Badge variant="warning" className="gap-1 py-1 px-2.5">
              <Clock className="w-3.5 h-3.5" />
              <span>En cours de traitement par le coordonnateur</span>
            </Badge>
          )}

          {demandeDuMois.statut === "paye" && (
            <Badge variant="success" className="gap-1 py-1 px-2.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paiement effectué</span>
            </Badge>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs bg-surface/60 p-3.5 rounded-xl border border-gray-100">
          <div>
            <p className="text-gray-400">Montant demandé</p>
            <p className="font-extrabold text-primary text-base mt-0.5">
              {Number(demandeDuMois.montantDemande).toLocaleString("fr-FR")} F CFA
            </p>
          </div>
          <div>
            <p className="text-gray-400">Bénéficiaire</p>
            <p className="font-semibold text-gray-800 mt-0.5">
              {configReseau.label}
            </p>
            <p className="font-mono text-gray-600 text-[11px]">{demandeDuMois.numeroMomo}</p>
          </div>
          <div>
            <p className="text-gray-400">Date de la demande</p>
            <p className="font-medium text-gray-800 mt-0.5">
              {new Date(demandeDuMois.dateDemande).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Détail spécifique si payé */}
        {demandeDuMois.statut === "paye" && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Virement Mobile Money exécuté</span>
            </div>
            <p className="text-emerald-700">
              Référence de transaction opérateur :{" "}
              <strong className="font-mono font-extrabold text-emerald-950">
                {demandeDuMois.referencePaiement || "Enregistrée par GSR"}
              </strong>
            </p>
            {demandeDuMois.datePaiement && (
              <p className="text-[11px] text-emerald-600">
                Validé le{" "}
                {new Date(demandeDuMois.datePaiement).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {/* Bouton WhatsApp de support/réclamation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
          <p className="text-gray-500">
            {demandeDuMois.statut === "paye"
              ? "Un doute ou vous n'avez pas reçu le SMS de votre opérateur ?"
              : "Une question ou une urgence concernant votre demande ?"}
          </p>
          <a
            href={lienWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contacter l&apos;administration sur WhatsApp</span>
          </a>
        </div>
      </div>
    );
  }

  // 3. Fenêtre ouverte : Solde insuffisant pour le retrait minimum
  if (soldeDisponible < MONTANT_MINIMUM_RETRAIT) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-bold text-sm sm:text-base">Solde insuffisant pour un retrait</h3>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Votre solde disponible actuel est de{" "}
          <strong>{soldeDisponible.toLocaleString("fr-FR")} F CFA</strong>. Le montant minimum exigé
          pour initier une demande de retrait est de{" "}
          <strong>{MONTANT_MINIMUM_RETRAIT.toLocaleString("fr-FR")} F CFA</strong>. Vos gains continueront
          d&apos;augmenter avec vos prochaines séances de TD.
        </p>
      </div>
    );
  }

  // 4. Fenêtre ouverte : Formulaire de demande de retrait disponible
  const paliers = [5000, 10000, 25000, 50000].filter((p) => p <= soldeDisponible);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montantNum = Number(montant);

    if (isNaN(montantNum) || montantNum < MONTANT_MINIMUM_RETRAIT) {
      toast.error(`Montant minimum : ${MONTANT_MINIMUM_RETRAIT.toLocaleString("fr-FR")} F CFA.`);
      return;
    }
    if (montantNum > soldeDisponible) {
      toast.error("Le montant demandé dépasse votre solde disponible.");
      return;
    }
    if (!numeroMomo.trim()) {
      toast.error("Veuillez renseigner un numéro Mobile Money.");
      return;
    }

    startTransition(async () => {
      const res = await demanderRetraitProfTD({
        montant: montantNum,
        reseau,
        numeroMomo,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Demande #${res.codeDemande} soumise avec succès !`);
      setMontant("");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Période de retrait ouverte (du 28 au {statutFenetre.dernierJour})
          </span>
        </div>
        <h3 className="font-bold text-gray-900 text-lg mt-1">Demander un paiement</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Choisissez le montant à retirer sur votre solde disponible. Les demandes sont limitées à une
          seule fois par mois.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Choix du montant */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="montant-retrait" className="text-xs font-semibold text-gray-800">
              Montant à retirer (F CFA) <span className="text-red-500">*</span>
            </Label>
            <span className="text-xs text-gray-400">
              Max disponible :{" "}
              <strong className="text-primary font-bold">
                {soldeDisponible.toLocaleString("fr-FR")} F
              </strong>
            </span>
          </div>

          <Input
            id="montant-retrait"
            type="number"
            min={MONTANT_MINIMUM_RETRAIT}
            max={soldeDisponible}
            step={500}
            required
            placeholder={`Minimum ${MONTANT_MINIMUM_RETRAIT.toLocaleString("fr-FR")} F`}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="text-base font-bold font-mono h-11"
          />

          {/* Raccourcis de montants */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-gray-400 mr-1">Raccourcis :</span>
            {paliers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMontant(String(p))}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              >
                {p.toLocaleString("fr-FR")} F
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMontant(String(soldeDisponible))}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer"
            >
              Tout retirer ({soldeDisponible.toLocaleString("fr-FR")} F)
            </button>
          </div>
        </div>

        {/* Choix de l'opérateur GSM */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-gray-800">
            Opérateur Mobile Money <span className="text-red-500">*</span>
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(["mtn", "moov", "celtis"] as ReseauMoMo[]).map((r) => {
              const cfg = RESEAUX_MOMO[r];
              const actif = reseau === r;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReseau(r)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    actif
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold leading-tight">{cfg.nomCourt}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{cfg.label}</p>
                  </div>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      actif ? "border-primary bg-primary" : "border-gray-300"
                    }`}
                  >
                    {actif && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Numéro Mobile Money */}
        <div className="space-y-1.5">
          <Label htmlFor="numero-momo" className="text-xs font-semibold text-gray-800">
            Numéro de réception {RESEAUX_MOMO[reseau]?.nomCourt}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="numero-momo"
            type="tel"
            required
            placeholder="Ex: 97 00 00 00"
            value={numeroMomo}
            onChange={(e) => setNumeroMomo(e.target.value)}
            className="font-mono text-sm h-10"
          />
          <p className="text-[11px] text-gray-400">
            Vous pouvez saisir n&apos;importe quel numéro de votre choix sur le réseau sélectionné.
          </p>
        </div>

        {/* Bouton de soumission */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto gap-2 text-sm font-semibold h-11 px-6 cursor-pointer"
          >
            <span>{isPending ? "Soumission en cours..." : "Soumettre ma demande de retrait"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
