"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Unlock } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { libererCreneauTD } from "@/actions/td-creneaux";

export function LibererCreneauTDDialog({ creneauId }: { creneauId: number }) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motif.trim()) return;

    startTransition(async () => {
      const result = await libererCreneauTD(creneauId, motif.trim());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Créneau libéré — de nouveau ouvert aux candidats encore disponibles");
      setOpen(false);
      setMotif("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Unlock className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Libérer</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Libérer ce créneau</DialogTitle>
          <DialogDescription>
            Le professeur validé se désiste. Le créneau redevient ouvert aux autres candidats qui avaient postulé et qui sont
            encore réellement disponibles sur ce créneau.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <Label htmlFor="motif-liberation">Motif</Label>
            <textarea
              id="motif-liberation"
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={3}
              placeholder="Ex. : le professeur a prévenu par WhatsApp qu'il ne pourra pas assurer ce créneau."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !motif.trim()}>
              {isPending ? "Libération..." : "Confirmer la libération"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
