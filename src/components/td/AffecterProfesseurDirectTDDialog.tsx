"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { affecterDirectementProfesseurTD } from "@/actions/td-arbitrage";

export interface ProfesseurOptionTD {
  id: number;
  nom: string;
  prenom: string;
  matiere_principale_id: number;
}

interface AffecterProfesseurDirectTDDialogProps {
  creneauId: number;
  titreCreneau: string;
  dateHeureCreneau: string;
  matiereId: number;
  professeurs: ProfesseurOptionTD[];
  nomMatiereParId: Record<number, string>;
}

export function AffecterProfesseurDirectTDDialog({
  creneauId,
  titreCreneau,
  dateHeureCreneau,
  matiereId,
  professeurs,
  nomMatiereParId,
}: AffecterProfesseurDirectTDDialogProps) {
  const [open, setOpen] = useState(false);
  const [professeurId, setProfesseurId] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Trier les professeurs : ceux de la matière du créneau en premier, puis alphabétiquement
  const profsTries = [...professeurs].sort((a, b) => {
    const aMemeMatiere = a.matiere_principale_id === matiereId ? 0 : 1;
    const bMemeMatiere = b.matiere_principale_id === matiereId ? 0 : 1;
    if (aMemeMatiere !== bMemeMatiere) return aMemeMatiere - bMemeMatiere;
    return a.nom.localeCompare(b.nom, "fr-FR");
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!professeurId) {
      toast.error("Veuillez sélectionner un professeur.");
      return;
    }

    if (!window.confirm("Confirmer l'affectation directe de ce professeur ? Les candidatures existantes sur ce créneau seront refusées et le créneau sera clôturé.")) {
      return;
    }

    startTransition(async () => {
      const result = await affecterDirectementProfesseurTD(creneauId, Number(professeurId));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Professeur affecté avec succès — créneau clôturé");
      setOpen(false);
      setProfesseurId("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-primary border-primary/20 hover:bg-primary/5">
          <UserPlus className="w-3.5 h-3.5" />
          Affecter directement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affectation directe d&apos;un enseignant</DialogTitle>
          <DialogDescription>
            Attribuez directement ce créneau à un professeur de votre choix. Les candidatures existantes en attente seront automatiquement refusées et le créneau sera clôturé.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogBody className="space-y-4">
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-900">{titreCreneau}</p>
              <p className="text-gray-500">{dateHeureCreneau}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="professeur">Professeur à affecter *</Label>
              <Select value={professeurId} onValueChange={setProfesseurId}>
                <SelectTrigger id="professeur">
                  <SelectValue placeholder="Sélectionner un professeur" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {profsTries.map((p) => {
                    const matiereNom = nomMatiereParId[p.matiere_principale_id] ?? "";
                    const estMatiereDuCreneau = p.matiere_principale_id === matiereId;
                    return (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.prenom} {p.nom} {matiereNom ? `(${matiereNom})` : ""} {estMatiereDuCreneau ? "★" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !professeurId}>
              {isPending ? "Affectation..." : "Confirmer l'affectation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
