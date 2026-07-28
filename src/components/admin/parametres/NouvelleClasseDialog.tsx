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
import { creerClasse } from "@/actions/donnees-scolaires";

export interface ClasseOption {
  id: number;
  nom_classe: string;
  nom_site: string;
}

interface NouvelleClasseDialogProps {
  siteId: number;
  ordreSuggere: number;
  classesDisponibles: ClasseOption[];
}

export function NouvelleClasseDialog({ siteId, ordreSuggere, classesDisponibles }: NouvelleClasseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [nomClasse, setNomClasse] = useState("");
  const [ordre, setOrdre] = useState(String(ordreSuggere));
  const [classeSuivanteId, setClasseSuivanteId] = useState("");
  const [tarifTd, setTarifTd] = useState("");

  function reset() {
    setNomClasse("");
    setOrdre(String(ordreSuggere));
    setClasseSuivanteId("");
    setTarifTd("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await creerClasse({
        nomClasse,
        siteId,
        ordre: Number(ordre),
        classeSuivanteId: classeSuivanteId ? Number(classeSuivanteId) : null,
        tarifTd: Number(tarifTd),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Classe créée");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5" />
          Nouvelle classe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle classe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="nom_classe">Nom de la classe</Label>
              <Input
                id="nom_classe"
                required
                placeholder="ex. 3ème, 3ème A, Seconde AB…"
                value={nomClasse}
                onChange={(e) => setNomClasse(e.target.value)}
              />
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
                  value={tarifTd}
                  onChange={(e) => setTarifTd(e.target.value)}
                />
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
              {isPending ? "Création..." : "Créer la classe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
