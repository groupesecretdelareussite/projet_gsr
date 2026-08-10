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
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { creerCreneauTD } from "@/actions/td-creneaux";

interface Option {
  id: number;
  nom: string;
}

interface NouveauCreneauTDDialogProps {
  semaineId: number;
  dateDebut: string;
  dateFin: string;
  classes: Option[];
  matieres: Option[];
}

export function NouveauCreneauTDDialog({ semaineId, dateDebut, dateFin, classes, matieres }: NouveauCreneauTDDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [dateTd, setDateTd] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [montantPrevu, setMontantPrevu] = useState("");

  function reset() {
    setClasseId("");
    setMatiereId("");
    setDateTd("");
    setHeureDebut("");
    setHeureFin("");
    setMontantPrevu("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await creerCreneauTD({
        semaineId,
        classeId: Number(classeId),
        matiereId: Number(matiereId),
        dateTd,
        heureDebut,
        heureFin,
        montantPrevu: Number(montantPrevu),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Créneau créé");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const peutSoumettre = classeId && matiereId && dateTd && heureDebut && heureFin && montantPrevu;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Ajouter un créneau</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau créneau</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Classe</Label>
                <Select value={classeId} onValueChange={setClasseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matière</Label>
                <Select value={matiereId} onValueChange={setMatiereId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {matieres.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="dateTd">
                Date (du{" "}
                {new Date(`${dateDebut}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au{" "}
                {new Date(`${dateFin}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })})
              </Label>
              <Input
                id="dateTd"
                type="date"
                required
                min={dateDebut}
                max={dateFin}
                value={dateTd}
                onChange={(e) => setDateTd(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="heureDebut">Heure de début</Label>
                <Input id="heureDebut" type="time" required value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="heureFin">Heure de fin</Label>
                <Input id="heureFin" type="time" required value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="montantPrevu">Budget prévu (FCFA)</Label>
              <Input
                id="montantPrevu"
                type="number"
                min={0}
                required
                value={montantPrevu}
                onChange={(e) => setMontantPrevu(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !peutSoumettre}>
              {isPending ? "Création..." : "Créer le créneau"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
