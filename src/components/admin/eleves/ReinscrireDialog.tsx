"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { reinscrireEleve } from "@/actions/eleves";
import { MODES_PAIEMENT, MODE_PAIEMENT_LABELS, type ModePaiement } from "@/lib/constants";
import { PENALITE_REINSCRIPTION_MONTANT } from "@/lib/reinscription";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface ReinscrireDialogProps {
  eleveId: number;
  nomComplet: string;
  raison: string;
  montantDu: number;
  moisSouscription: string | null;
  estVenuDansLeMois: boolean | null;
}

export function ReinscrireDialog({
  eleveId,
  nomComplet,
  raison,
  montantDu,
  moisSouscription,
  estVenuDansLeMois,
}: ReinscrireDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModePaiement>("Presentiel");
  const [date, setDate] = useState(todayIso());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const montantDuApplicable = raison === "defaut_paiement" && montantDu > 0 && moisSouscription !== null;
  const moisExonere = montantDuApplicable && estVenuDansLeMois === false;
  const montantDuAPercevoir = montantDuApplicable && !moisExonere ? montantDu : 0;
  const total = montantDuAPercevoir + PENALITE_REINSCRIPTION_MONTANT;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await reinscrireEleve(eleveId, { modePaiement: mode, datePaiement: date });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Élève réinscrit");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserCheck className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Réinscrire</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinscrire {nomComplet}</DialogTitle>
          <DialogDescription>Le montant total doit être perçu avant validation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <dl className="text-sm border border-gray-200 rounded-lg divide-y divide-gray-100">
              {montantDuApplicable && (
                <div className="flex items-center justify-between px-3 py-2">
                  <dt className="text-gray-500">Montant dû ({moisSouscription})</dt>
                  <dd className={moisExonere ? "text-gray-400 italic" : "font-semibold text-gray-800"}>
                    {moisExonere ? "Exonéré — absence" : `${montantDu} F`}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2">
                <dt className="text-gray-500">Pénalité de réinscription</dt>
                <dd className="font-semibold text-gray-800">{PENALITE_REINSCRIPTION_MONTANT} F</dd>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-b-lg">
                <dt className="font-semibold text-gray-900">Total à percevoir</dt>
                <dd className="font-bold text-primary">{total} F</dd>
              </div>
            </dl>

            <div>
              <Label htmlFor="mode">Mode de paiement</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as ModePaiement)}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES_PAIEMENT.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_PAIEMENT_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date du paiement</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Réinscription..." : `Confirmer — ${total} F perçus`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
