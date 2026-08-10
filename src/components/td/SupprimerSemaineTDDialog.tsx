"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { supprimerSemaineTD } from "@/actions/td-semaines";

export function SupprimerSemaineTDDialog({ semaineId, libelle }: { semaineId: number; libelle: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await supprimerSemaineTD(semaineId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${libelle} supprimée`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Supprimer</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer {libelle}</DialogTitle>
          <DialogDescription>
            Action irréversible — supprime aussi tous les créneaux de cette semaine et les candidatures associées.
            Impossible si des professeurs ont déjà postulé sur l&apos;un de ses créneaux.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Suppression..." : "Confirmer la suppression"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
