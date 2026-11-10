"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, AlertTriangle, ArrowLeft } from "lucide-react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { modifierCreneauTD } from "@/actions/td-creneaux";
import { formaterDateMois } from "@/lib/date-utils";

interface CreneauInitialTD {
  id: number;
  classeId: number;
  matiereId: number;
  dateTd: string;
  heureDebut: string;
  heureFin: string;
  montantPrevu: number;
}

interface Option {
  id: number;
  nom: string;
}

interface ClasseOptionTD {
  id: number;
  nom: string;
  site: string;
}

interface ModifierCreneauTDDialogProps {
  creneau: CreneauInitialTD;
  semaine: {
    id: number;
    dateDebut: string;
    dateFin: string;
    statut: string;
  };
  classes: ClasseOptionTD[];
  matieres: Option[];
}

export function ModifierCreneauTDDialog({ creneau, semaine, classes, matieres }: ModifierCreneauTDDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [classeId, setClasseId] = useState(String(creneau.classeId));
  const [matiereId, setMatiereId] = useState(String(creneau.matiereId));
  const [dateTd, setDateTd] = useState(creneau.dateTd);
  const [heureDebut, setHeureDebut] = useState(creneau.heureDebut.slice(0, 5));
  const [heureFin, setHeureFin] = useState(creneau.heureFin.slice(0, 5));
  const [montantPrevu, setMontantPrevu] = useState(String(creneau.montantPrevu));

  const [alerteConflit, setAlerteConflit] = useState<{ message: string; candidats: string[] } | null>(null);

  // Synchroniser les champs si les props changent
  useEffect(() => {
    setClasseId(String(creneau.classeId));
    setMatiereId(String(creneau.matiereId));
    setDateTd(creneau.dateTd);
    setHeureDebut(creneau.heureDebut.slice(0, 5));
    setHeureFin(creneau.heureFin.slice(0, 5));
    setMontantPrevu(String(creneau.montantPrevu));
    setAlerteConflit(null);
  }, [creneau]);

  function executerModification(forcer: boolean) {
    startTransition(async () => {
      const result = await modifierCreneauTD({
        creneauId: creneau.id,
        classeId: Number(classeId),
        matiereId: Number(matiereId),
        dateTd,
        heureDebut,
        heureFin,
        montantPrevu: Number(montantPrevu),
        forcerAnnulationCandidaturesSiConflit: forcer,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.confirmationRequise) {
        setAlerteConflit({
          message: result.messageConfirmation || "Un conflit d'horaire a été détecté.",
          candidats: result.candidatsEnConflit || [],
        });
        return;
      }

      toast.success("Créneau modifié");
      setAlerteConflit(null);
      setOpen(false);
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    executerModification(false);
  }

  const peutSoumettre = classeId && matiereId && dateTd && heureDebut && heureFin && montantPrevu;

  const classesParSite = new Map<string, ClasseOptionTD[]>();
  for (const c of classes) {
    classesParSite.set(c.site, [...(classesParSite.get(c.site) ?? []), c]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nouveau) => {
        setOpen(nouveau);
        if (!nouveau) {
          setAlerteConflit(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Modifier le créneau">
          <Pencil className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Modifier</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{alerteConflit ? "Conflit d'agenda détecté" : "Modifier le créneau"}</DialogTitle>
        </DialogHeader>

        {alerteConflit ? (
          <div>
            <DialogBody className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 space-y-2">
                  <p className="font-semibold">Attention : conflit avec l'emploi du temps de professeurs</p>
                  <p className="text-amber-800 text-xs sm:text-sm">
                    Les professeurs suivants ont postulé sur ce créneau et sont déjà engagés sur un autre cours validé à ces
                    mêmes horaires :
                  </p>
                  <ul className="list-disc list-inside font-medium text-xs sm:text-sm text-amber-950">
                    {alerteConflit.candidats.map((nom, idx) => (
                      <li key={idx}>{nom}</li>
                    ))}
                  </ul>
                  <p className="text-amber-800 text-xs">
                    Si vous confirmez cette modification, <strong>les candidatures en attente seront annulées</strong> afin de
                    libérer les professeurs et leur permettre de re-postuler en connaissance des nouvelles informations.
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setAlerteConflit(null)} disabled={isPending}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Revenir au formulaire
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => executerModification(true)}
                disabled={isPending}
              >
                {isPending ? "Modification en cours..." : "Confirmer et libérer les candidatures"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
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
                      {Array.from(classesParSite.entries()).map(([site, classesSite]) => (
                        <SelectGroup key={site}>
                          <SelectLabel>{site}</SelectLabel>
                          {classesSite.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
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
                <Label htmlFor="dateTdModif">
                  Date (du {formaterDateMois(semaine.dateDebut)} au {formaterDateMois(semaine.dateFin)})
                </Label>
                <Input
                  id="dateTdModif"
                  type="date"
                  required
                  min={semaine.dateDebut}
                  max={semaine.dateFin}
                  value={dateTd}
                  onChange={(e) => setDateTd(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="heureDebutModif">Heure de début</Label>
                  <Input
                    id="heureDebutModif"
                    type="time"
                    required
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="heureFinModif">Heure de fin</Label>
                  <Input
                    id="heureFinModif"
                    type="time"
                    required
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="montantPrevuModif">Budget prévu (FCFA)</Label>
                <Input
                  id="montantPrevuModif"
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
                {isPending ? "Modification..." : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
