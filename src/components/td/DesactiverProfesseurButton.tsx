"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserX, UserCheck } from "lucide-react";
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
import { desactiverProfesseurTD, reactiverProfesseurTD } from "@/actions/td-config";

/** §4 GSR_ARCHITECTURE.md — jamais de suppression d'un professeur, uniquement désactivation (historique conservé). */
export function DesactiverProfesseurButton({
  professeurId,
  nomComplet,
  actif,
}: {
  professeurId: number;
  nomComplet: string;
  actif: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = actif ? await desactiverProfesseurTD(professeurId) : await reactiverProfesseurTD(professeurId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(actif ? `${nomComplet} désactivé` : `${nomComplet} réactivé`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={actif ? "destructive" : "outline"} size="sm">
          {actif ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          <span className={HOVER_ONLY_LABEL}>{actif ? "Désactiver" : "Réactiver"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actif ? "Désactiver" : "Réactiver"} {nomComplet}
          </DialogTitle>
          <DialogDescription>
            {actif
              ? "Le professeur ne pourra plus se connecter ni postuler sur de nouveaux créneaux."
              : "Le professeur pourra de nouveau se connecter et postuler."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" variant={actif ? "destructive" : "default"} disabled={isPending} onClick={handleConfirm}>
            {isPending ? "..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
