"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ajouterCategorie } from "@/actions/depenses";

/** §11 GSR_ARCHITECTURE.md — "Dialog avec champ texte → ajouterCategorie() → mise à jour optimiste du select". */
export function AjouterCategorieDialog({ onCategorieAjoutee }: { onCategorieAjoutee: (cat: { id: number; nom: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await ajouterCategorie(nom);
      if (result.error || !result.id) {
        toast.error(result.error ?? "Échec de la création");
        return;
      }
      onCategorieAjoutee({ id: result.id, nom: nom.trim() });
      toast.success("Catégorie ajoutée");
      setOpen(false);
      setNom("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5" />
          Nouvelle catégorie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie de dépense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <Label htmlFor="nomCategorie">Nom</Label>
            <Input id="nomCategorie" required value={nom} onChange={(e) => setNom(e.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !nom.trim()}>
              {isPending ? "Création..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
