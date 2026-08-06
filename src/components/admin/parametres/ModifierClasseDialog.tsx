"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import { modifierClasse } from "@/actions/donnees-scolaires";
import type { ClasseOption } from "@/components/admin/parametres/NouvelleClasseDialog";

interface ModifierClasseDialogProps {
  classeId: number;
  initialNomClasse: string;
  initialOrdre: number;
  initialClasseSuivanteId: number | null;
  initialTarifTd: number;
  tarifVerrouille: boolean;
  classesDisponibles: ClasseOption[]; // déjà filtré pour exclure cette classe elle-même
}

export function ModifierClasseDialog({
  classeId,
  initialNomClasse,
  initialOrdre,
  initialClasseSuivanteId,
  initialTarifTd,
  tarifVerrouille,
  classesDisponibles,
}: ModifierClasseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [nomClasse, setNomClasse] = useState(initialNomClasse);
  const [ordre, setOrdre] = useState(String(initialOrdre));
  const [classeSuivanteId, setClasseSuivanteId] = useState(
    initialClasseSuivanteId ? String(initialClasseSuivanteId) : ""
  );
  const [tarifTd, setTarifTd] = useState(String(initialTarifTd));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await modifierClasse({
        id: classeId,
        nomClasse,
        ordre: Number(ordre),
        classeSuivanteId: classeSuivanteId ? Number(classeSuivanteId) : null,
        tarifTd: Number(tarifTd),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Classe modifiée");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Modifier</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la classe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="nom_classe">Nom de la classe</Label>
              <Input id="nom_classe" required value={nomClasse} onChange={(e) => setNomClasse(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ordre">Ordre d&apos;affichage</Label>
                <Input id="ordre" type="number" required value={ordre} onChange={(e) => setOrdre(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tarif_td">Tarif TD mensuel (FCFA)</Label>
                <Input
                  id="tarif_td"
                  type="number"
                  required
                  min={0}
                  disabled={tarifVerrouille}
                  value={tarifTd}
                  onChange={(e) => setTarifTd(e.target.value)}
                />
                {tarifVerrouille && (
                  <p className="text-xs text-amber-600 mt-1">
                    Verrouillé pendant l&apos;année scolaire en cours — modifiable uniquement en période de vacances.
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Classe suivante (optionnel)</Label>
              <Select value={classeSuivanteId} onValueChange={setClasseSuivanteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune — à traiter manuellement en fin d'année" />
                </SelectTrigger>
                <SelectContent>
                  {classesDisponibles.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nom_classe} ({c.nom_site})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                Si laissé vide : cet élève sera traité manuellement en fin d&apos;année (fin de parcours ou choix à
                faire, ex. série), jamais supprimé automatiquement.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !nomClasse || !ordre || !tarifTd}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
