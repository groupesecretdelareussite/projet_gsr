"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { modifierSemaineTD } from "@/actions/td-semaines";

interface ModifierSemaineTDDialogProps {
  semaineId: number;
  initialLibelle: string;
  initialDateDebut: string;
}

export function ModifierSemaineTDDialog({ semaineId, initialLibelle, initialDateDebut }: ModifierSemaineTDDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [libelle, setLibelle] = useState(initialLibelle);
  const [dateDebut, setDateDebut] = useState(initialDateDebut);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await modifierSemaineTD({ id: semaineId, libelle, dateDebut });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Semaine modifiée");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Modifier</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la semaine</DialogTitle>
          <DialogDescription>La date de fin (dimanche) est recalculée automatiquement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="libelle">Libellé</Label>
              <Input id="libelle" required value={libelle} onChange={(e) => setLibelle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dateDebut">Lundi de la semaine</Label>
              <Input id="dateDebut" type="date" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !libelle || !dateDebut}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
