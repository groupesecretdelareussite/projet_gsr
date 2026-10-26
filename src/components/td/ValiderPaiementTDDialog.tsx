"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowUpRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RESEAUX_MOMO, type ReseauMoMo } from "@/lib/td-finances";
import { validerPaiementProfTD, rejeterDemandeRetraitProfTD } from "@/actions/td-paiements";

interface ValiderPaiementTDDialogProps {
  demandeId: number;
  codeDemande: string;
  professeurNom: string;
  professeurTelephone: string;
  montant: number;
  reseau: ReseauMoMo;
  numeroMomo: string;
  dateDemande: string;
}

export function ValiderPaiementTDDialog({
  demandeId,
  codeDemande,
  professeurNom,
  professeurTelephone,
  montant,
  reseau,
  numeroMomo,
  dateDemande,
}: ValiderPaiementTDDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"valider" | "rejeter">("valider");
  const [reference, setReference] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [motifRejet, setMotifRejet] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const configReseau = RESEAUX_MOMO[reseau] ?? {
    label: reseau,
    placeholderRef: "Ex: ID transaction",
    badgeClass: "bg-gray-100 text-gray-800",
  };

  function handleValider(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error("Veuillez renseigner la référence de transaction opérateur.");
      return;
    }

    startTransition(async () => {
      const res = await validerPaiementProfTD(demandeId, reference, commentaire);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Paiement de ${montant.toLocaleString("fr-FR")} F validé avec succès`);
      setOpen(false);
      setReference("");
      setCommentaire("");
      router.refresh();
    });
  }

  function handleRejeter(e: React.FormEvent) {
    e.preventDefault();
    if (!motifRejet.trim() || motifRejet.trim().length < 3) {
      toast.error("Veuillez saisir un motif de rejet clair.");
      return;
    }

    startTransition(async () => {
      const res = await rejeterDemandeRetraitProfTD(demandeId, motifRejet);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Demande rejetée. Le solde du professeur a été recrédité.");
      setOpen(false);
      setMotifRejet("");
      setMode("valider");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs font-semibold cursor-pointer">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Payer</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {mode === "valider" ? "Règlement Mobile Money" : "Rejeter la demande"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Dossier #{codeDemande} · Demandé le{" "}
                {new Date(dateDemande).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Récapitulatif du transfert */}
        <div className="bg-surface/80 rounded-xl p-3.5 border border-gray-100 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Professeur :</span>
            <span className="font-semibold text-gray-900">{professeurNom}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Opérateur :</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${configReseau.badgeClass}`}
            >
              {configReseau.label}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Numéro de transfert :</span>
            <span className="font-mono font-bold text-gray-900 text-sm">{numeroMomo}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200/60">
            <span className="font-medium text-gray-700">Montant net à transférer :</span>
            <span className="font-extrabold text-primary text-base">
              {Number(montant).toLocaleString("fr-FR")} F CFA
            </span>
          </div>
        </div>

        {mode === "valider" ? (
          <form onSubmit={handleValider} className="space-y-4">
            <DialogBody className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor={`ref-${demandeId}`} className="text-xs font-semibold text-gray-800">
                  Référence de transaction opérateur <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`ref-${demandeId}`}
                  type="text"
                  required
                  placeholder={configReseau.placeholderRef}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="font-mono text-xs"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400">
                  Code unique reçu par SMS de {configReseau.nomCourt} après avoir exécuté le transfert.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`comm-${demandeId}`} className="text-xs font-medium text-gray-600">
                  Note ou commentaire interne (facultatif)
                </Label>
                <Input
                  id={`comm-${demandeId}`}
                  type="text"
                  placeholder="Ex: Envoyé depuis le compte marchand GSR"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  className="text-xs"
                />
              </div>
            </DialogBody>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setMode("rejeter")}
                className="text-xs text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                Rejeter cette demande...
              </button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="cursor-pointer">
                  {isPending ? "Validation..." : "Confirmer le paiement"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleRejeter} className="space-y-4">
            <DialogBody className="space-y-3 pt-2">
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Le rejet annulera la réservation et <strong>recréditera automatiquement</strong>{" "}
                  {montant.toLocaleString("fr-FR")} F sur le solde du professeur.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`motif-${demandeId}`} className="text-xs font-semibold text-gray-800">
                  Motif du rejet <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`motif-${demandeId}`}
                  type="text"
                  required
                  placeholder="Ex: Numéro Mobile Money erroné / Compte plafonné"
                  value={motifRejet}
                  onChange={(e) => setMotifRejet(e.target.value)}
                  className="text-xs"
                  autoFocus
                />
              </div>
            </DialogBody>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setMode("valider")}
                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                ← Retour au paiement
              </button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
                >
                  {isPending ? "Rejet en cours..." : "Confirmer le rejet"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
