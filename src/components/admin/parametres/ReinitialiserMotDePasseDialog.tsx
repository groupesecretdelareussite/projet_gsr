"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
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
import { reinitialiserMotDePasseUtilisateur } from "@/actions/utilisateurs";

/** §5.7 GSR_ARCHITECTURE.md — réinitialisation manuelle par le coordonnateur, ici pour un autre compte staff. */
export function ReinitialiserMotDePasseDialog({ userId, username }: { userId: string; username: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return;

    startTransition(async () => {
      const result = await reinitialiserMotDePasseUtilisateur(userId, password);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Mot de passe de ${username} réinitialisé`);
      setOpen(false);
      setPassword("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="w-3.5 h-3.5" />
          Mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>Communiquez ce nouveau mot de passe à {username} de vive voix.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || password.length < 8}>
              {isPending ? "Réinitialisation..." : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
