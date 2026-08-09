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
import { AjouterCategorieDialog } from "@/components/admin/comptabilite/AjouterCategorieDialog";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { modifierDepense } from "@/actions/depenses";

interface Categorie {
  id: number;
  nom: string;
}

interface ModifierDepenseDialogProps {
  depenseId: number;
  initialCategorieId: number;
  initialLibelle: string;
  initialMontant: number;
  initialDateDepense: string;
  categoriesInitiales: Categorie[];
}

export function ModifierDepenseDialog({
  depenseId,
  initialCategorieId,
  initialLibelle,
  initialMontant,
  initialDateDepense,
  categoriesInitiales,
}: ModifierDepenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [categories, setCategories] = useState(categoriesInitiales);
  const [categorieId, setCategorieId] = useState(String(initialCategorieId));
  const [libelle, setLibelle] = useState(initialLibelle);
  const [montant, setMontant] = useState(String(initialMontant));
  const [dateDepense, setDateDepense] = useState(initialDateDepense);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await modifierDepense({
        id: depenseId,
        categorieId: Number(categorieId),
        libelle,
        montant: Number(montant),
        dateDepense,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dépense modifiée");
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
          <DialogTitle>Modifier la dépense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label>Catégorie</Label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Select value={categorieId} onValueChange={setCategorieId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AjouterCategorieDialog
                  onCategorieAjoutee={(cat) => {
                    setCategories((prev) => [...prev, cat]);
                    setCategorieId(String(cat.id));
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="libelle">Libellé</Label>
              <Input id="libelle" required value={libelle} onChange={(e) => setLibelle(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montant">Montant (FCFA)</Label>
                <Input id="montant" type="number" min="1" required value={montant} onChange={(e) => setMontant(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dateDepense">Date</Label>
                <Input
                  id="dateDepense"
                  type="date"
                  required
                  value={dateDepense}
                  onChange={(e) => setDateDepense(e.target.value)}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
