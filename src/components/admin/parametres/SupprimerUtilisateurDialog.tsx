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
import { supprimerUtilisateur } from "@/actions/utilisateurs";

export function SupprimerUtilisateurDialog({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await supprimerUtilisateur(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${username} supprimé`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer {username}</DialogTitle>
          <DialogDescription>
            Action irréversible. Impossible si ce compte a déjà un historique d&apos;actions — désactivez-le dans ce cas.
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
