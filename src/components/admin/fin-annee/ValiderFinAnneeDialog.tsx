"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
import { validerFinAnnee } from "@/actions/fin-annee";

const MOT_CONFIRMATION = "CONFIRMER";

function suggestions(dateFinActuelle: string) {
  const anneeFin = new Date(dateFinActuelle).getFullYear();
  return {
    libelle: `${anneeFin}-${anneeFin + 1}`,
    dateDebut: `${anneeFin}-10-01`,
    dateFin: `${anneeFin + 1}-05-31`,
  };
}

export function ValiderFinAnneeDialog({
  disabled,
  enAttente,
  nbPasse,
  nbRedouble,
  nbSortant,
  nbSuspendus,
  anneeActuelle,
}: {
  disabled: boolean;
  enAttente: number;
  nbPasse: number;
  nbRedouble: number;
  nbSortant: number;
  nbSuspendus: number;
  anneeActuelle: { libelle: string; dateFin: string };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const defauts = useMemo(() => suggestions(anneeActuelle.dateFin), [anneeActuelle.dateFin]);
  const [libelle, setLibelle] = useState(defauts.libelle);
  const [dateDebut, setDateDebut] = useState(defauts.dateDebut);
  const [dateFin, setDateFin] = useState(defauts.dateFin);
  const [confirmation, setConfirmation] = useState("");

  const nbSuppressionsDefinitives = nbSortant + nbSuspendus;
  const peutValider = confirmation === MOT_CONFIRMATION && libelle.trim() !== "" && dateDebut !== "" && dateFin !== "" && dateDebut < dateFin;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!peutValider) return;

    startTransition(async () => {
      const result = await validerFinAnnee({ libelle: libelle.trim(), dateDebut, dateFin });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Année scolaire ${libelle} démarrée`);
      setOpen(false);
      router.push("/admin/tableau-de-bord");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setConfirmation("");
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={disabled}>
          Valider la fin d&apos;année
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider la fin d&apos;année</DialogTitle>
          <DialogDescription>Action définitive et irréversible.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {enAttente > 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {enAttente} élève(s) sans décision — impossible de valider.
              </p>
            )}

            <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 space-y-1">
                <p>
                  <strong>{nbSuppressionsDefinitives}</strong> élève(s) seront supprimé(s) <strong>définitivement</strong> de
                  la base ({nbSortant} sortant(s), {nbSuspendus} encore suspendu(s)), avec tout leur historique
                  (paiements, présences, notes).
                </p>
                <p>
                  {nbPasse} élève(s) passeront en classe supérieure, {nbRedouble} redoubleront.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="libelle">Libellé</Label>
                <Input id="libelle" required value={libelle} onChange={(e) => setLibelle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="date_debut">Début</Label>
                <Input id="date_debut" type="date" required value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="date_fin">Fin</Label>
                <Input id="date_fin" type="date" required value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmation">
                Tapez <strong>{MOT_CONFIRMATION}</strong> pour confirmer
              </Label>
              <Input id="confirmation" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={!peutValider || isPending}>
              {isPending ? "Validation..." : "Confirmer définitivement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
