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
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { supprimerPaiement } from "@/actions/paiements";

/**
 * §8.7/interdit #4 GSR_ARCHITECTURE.md — suppression d'un paiement toujours
 * derrière mot de passe + motif vérifiés côté serveur. Réservé
 * coordonnateur/comptable — le composant n'est rendu que pour ces rôles
 * (voir historique/page.tsx), l'action serveur re-vérifie de toute façon.
 */
export function SupprimerPaiementDialog({ paiementId, description }: { paiementId: number; description: string }) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motif.trim() || !password) return;

    startTransition(async () => {
      const result = await supprimerPaiement(paiementId, motif.trim(), password);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Paiement supprimé");
      setOpen(false);
      setMotif("");
      setPassword("");
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
          <DialogTitle>Supprimer le paiement</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="motif">Motif de la suppression</Label>
              <textarea
                id="motif"
                required
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
            <div>
              <Label htmlFor="password">Votre mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending || !motif.trim() || !password}>
              {isPending ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
