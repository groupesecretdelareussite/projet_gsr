"use client";

import { useState, useTransition } from "react";
import { ShieldOff } from "lucide-react";
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
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { reinitialiserMfaUtilisateur } from "@/actions/utilisateurs";

export function ReinitialiserMfaDialog({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await reinitialiserMfaUtilisateur(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Double authentification (2FA) réinitialisée pour ${username}`);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Réinitialiser 2FA">
          <ShieldOff className="w-3.5 h-3.5 text-amber-600" />
          <span className={HOVER_ONLY_LABEL}>Reset 2FA</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le 2FA de {username}</DialogTitle>
          <DialogDescription>
            Action de dépannage d&apos;urgence en cas de perte de smartphone ou de codes de secours.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Cette action va révoquer immédiatement la double authentification de{" "}
            <strong className="font-semibold text-gray-900">{username}</strong> et supprimer ses anciens codes de secours.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            • L&apos;agent pourra se reconnecter directement avec son mot de passe habituel.{"\n"}
            • Une fois connecté, il pourra réactiver son 2FA avec son nouveau smartphone dans son espace « Mon compte ».
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleReset} disabled={isPending}>
            {isPending ? "Réinitialisation..." : "Confirmer la réinitialisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
