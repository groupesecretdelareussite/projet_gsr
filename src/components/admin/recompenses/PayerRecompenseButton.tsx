"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
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
import { payerRecompensesEleve, type NoteEligibleInput } from "@/actions/recompenses";

export function PayerRecompenseButton({
  eleveId,
  eleveNom,
  elevePrenoms,
  nomClasse,
  mois,
  anneeScolaireId,
  notesImpayees,
}: {
  eleveId: number;
  eleveNom: string;
  elevePrenoms: string;
  nomClasse: string;
  mois: string;
  anneeScolaireId: number;
  notesImpayees: NoteEligibleInput[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const montantTotal = notesImpayees.reduce((s, n) => s + n.montant, 0);

  function handlePayer() {
    startTransition(async () => {
      const res = await payerRecompensesEleve({
        eleveId,
        mois,
        anneeScolaireId,
        notes: notesImpayees,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Paiement de ${montantTotal.toLocaleString("fr-FR")} F enregistré pour ${eleveNom} ${elevePrenoms}`);
      setOpen(false);
      router.refresh();
    });
  }

  if (notesImpayees.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
          <HandCoins className="w-3.5 h-3.5" />
          <span>Payer ({montantTotal.toLocaleString("fr-FR")} F)</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmer le décaissement</DialogTitle>
          <DialogDescription>
            Enregistrer le paiement des récompenses pour {eleveNom} {elevePrenoms} ({nomClasse}) pour {mois}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
            <p className="text-xs text-emerald-700 font-medium">Montant total à décaisser</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">{montantTotal.toLocaleString("fr-FR")} F</p>
            <p className="text-xs text-emerald-600 mt-1">Correspond à {notesImpayees.length} note(s) méritante(s)</p>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Cette action enregistre automatiquement une dépense annexe dans la catégorie <strong>Récompense</strong> et
            verrouille ces notes contre tout double paiement.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handlePayer}
            disabled={isPending}
          >
            {isPending ? "Paiement en cours..." : "Confirmer le paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
