"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { creerSemaineTD } from "@/actions/td-semaines";

export function NouvelleSemaineTDDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [libelle, setLibelle] = useState("");
  const [dateDebut, setDateDebut] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await creerSemaineTD({ libelle, dateDebut });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Semaine créée");
      setOpen(false);
      setLibelle("");
      setDateDebut("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-3.5 h-3.5" />
          Nouvelle semaine
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle semaine TD</DialogTitle>
          <DialogDescription>La date de fin (dimanche) est calculée automatiquement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="libelle">Libellé</Label>
              <Input
                id="libelle"
                required
                placeholder="Semaine du 14 Juin 2026"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateDebut">Mercredi de la semaine</Label>
              <Input id="dateDebut" type="date" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !libelle || !dateDebut}>
              {isPending ? "Création..." : "Créer la semaine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
