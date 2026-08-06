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
import { desactiverUtilisateur, reactiverUtilisateur } from "@/actions/utilisateurs";

/** §5.1 GSR_ARCHITECTURE.md — la désactivation révoque immédiatement la session (auth.admin.signOut). */
export function DesactiverUtilisateurButton({
  userId,
  username,
  actif,
}: {
  userId: string;
  username: string;
  actif: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = actif ? await desactiverUtilisateur(userId) : await reactiverUtilisateur(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(actif ? `${username} désactivé` : `${username} réactivé`);
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
          <DialogTitle>{actif ? "Désactiver" : "Réactiver"} {username}</DialogTitle>
          <DialogDescription>
            {actif
              ? "Le compte sera immédiatement déconnecté et ne pourra plus se connecter."
              : "Le compte pourra de nouveau se connecter."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            variant={actif ? "destructive" : "default"}
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? "..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
