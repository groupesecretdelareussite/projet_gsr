"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
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
import { toutPayerRecompenses, type EleveToutPayerInput } from "@/actions/recompenses";

export function ToutPayerButton({
  mois,
  anneeScolaireId,
  elevesImpayes,
}: {
  mois: string;
  anneeScolaireId: number;
  elevesImpayes: EleveToutPayerInput[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const totalEleves = elevesImpayes.length;
  const montantGlobal = elevesImpayes.reduce((s, e) => s + e.notes.reduce((sn, n) => sn + n.montant, 0), 0);

  if (totalEleves === 0 || montantGlobal === 0) {
    return null;
  }

  function handleToutPayer() {
    startTransition(async () => {
      const res = await toutPayerRecompenses({
        mois,
        anneeScolaireId,
        eleves: elevesImpayes,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        `Paiement groupé réussi : ${res.nbPayes} élève(s) payé(s) pour un total de ${montantGlobal.toLocaleString("fr-FR")} F.`
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
          <Coins className="w-4 h-4" />
          <span>Tout payer ({montantGlobal.toLocaleString("fr-FR")} F)</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement groupé des récompenses</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de valider le versement des récompenses pour <strong>{mois}</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Montant total du décaissement</p>
            <p className="text-3xl font-extrabold text-emerald-900 mt-1">{montantGlobal.toLocaleString("fr-FR")} F</p>
            <p className="text-xs text-emerald-700 mt-1">
              Concerne <strong>{totalEleves} élève(s)</strong> avec des récompenses en attente.
            </p>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Chaque paiement sera individualisé et enregistré dans les <strong>Dépenses annexes</strong> (catégorie{" "}
            <em>Récompense</em>). Les notes correspondantes seront définitivement verrouillées.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleToutPayer}
            disabled={isPending}
          >
            {isPending ? "Paiement en cours..." : "Valider tous les paiements"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
