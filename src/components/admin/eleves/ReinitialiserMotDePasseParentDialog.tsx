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
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { reinitialiserMotDePasseParent } from "@/actions/auth-parent";

/** §5.7 GSR_ARCHITECTURE.md — réinitialisation manuelle par le coordonnateur du compte du portail parents d'un élève. */
export function ReinitialiserMotDePasseParentDialog({ matricule, nomComplet }: { matricule: string; nomComplet: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return;

    startTransition(async () => {
      const result = await reinitialiserMotDePasseParent(matricule, password);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Mot de passe du compte parent de ${nomComplet} réinitialisé`);
      setOpen(false);
      setPassword("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Mdp parent</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe du portail parents</DialogTitle>
          <DialogDescription>
            Pour {nomComplet} ({matricule}). Échoue s&apos;il n&apos;existe pas encore de compte parent pour cet élève.
          </DialogDescription>
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
