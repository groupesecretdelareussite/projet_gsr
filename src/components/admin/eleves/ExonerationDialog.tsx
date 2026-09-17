"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, Trash2 } from "lucide-react";
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
import { attribuerExoneration, revoquerExoneration } from "@/actions/exonerations";
import { MOIS_SCOLAIRES, type MoisScolaire } from "@/lib/constants";

interface ExonerationDialogProps {
  eleveId: number;
  nomComplet: string;
  exonerationActive?: {
    id: number;
    typeExoneration: "permanente" | "bourse";
    nombreMois: number;
    moisCouverts: string[];
    motif: string;
  } | null;
}

export function ExonerationDialog({ eleveId, nomComplet, exonerationActive }: ExonerationDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"permanente" | "bourse">(
    exonerationActive?.typeExoneration ?? "permanente"
  );
  const [moisSelectionnes, setMoisSelectionnes] = useState<MoisScolaire[]>(
    (exonerationActive?.moisCouverts as MoisScolaire[]) ?? [...MOIS_SCOLAIRES]
  );
  const [motif, setMotif] = useState(exonerationActive?.motif ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTypeChange(nouveauType: "permanente" | "bourse") {
    setType(nouveauType);
    if (nouveauType === "permanente") {
      setMoisSelectionnes([...MOIS_SCOLAIRES]);
    }
  }

  function toggleMois(m: MoisScolaire) {
    if (type === "permanente") return;
    if (moisSelectionnes.includes(m)) {
      setMoisSelectionnes(moisSelectionnes.filter((item) => item !== m));
    } else {
      setMoisSelectionnes([...moisSelectionnes, m]);
    }
  }

  function appliquerPreset(nombre: number) {
    setType("bourse");
    setMoisSelectionnes(MOIS_SCOLAIRES.slice(0, nombre));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motif.trim()) {
      toast.error("Le motif est obligatoire.");
      return;
    }
    if (type === "bourse" && moisSelectionnes.length === 0) {
      toast.error("Veuillez sélectionner au moins un mois pour la bourse.");
      return;
    }

    startTransition(async () => {
      const res = await attribuerExoneration({
        eleveId,
        typeExoneration: type,
        moisCouverts: type === "permanente" ? [...MOIS_SCOLAIRES] : moisSelectionnes,
        motif: motif.trim(),
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        type === "permanente"
          ? "Exonération permanente enregistrée"
          : `Bourse (${moisSelectionnes.length} mois) enregistrée`
      );
      setOpen(false);
      router.refresh();
    });
  }

  function handleRevoquer() {
    if (!confirm("Confirmer la révocation de cette exonération ? Les mois redeviendront payables.")) {
      return;
    }

    startTransition(async () => {
      const res = await revoquerExoneration(eleveId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Exonération révoquée avec succès.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
          <Award className="w-3.5 h-3.5 text-primary" />
          <span>{exonerationActive ? "Gérer l'exonération" : "Exonérer"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bourse et Exonération — {nomComplet}</DialogTitle>
          <DialogDescription>
            Configuration réservée au coordonnateur pour dispenser l&apos;élève des frais mensuels.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {exonerationActive && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 space-y-1">
                <div className="font-semibold text-gray-900">Statut actif :</div>
                <div>
                  Type :{" "}
                  <span className="font-medium text-primary">
                    {exonerationActive.typeExoneration === "permanente"
                      ? "Exonération permanente (Année complète)"
                      : `Bourse (${exonerationActive.nombreMois} mois)`}
                  </span>
                </div>
                <div>Motif enregistré : {exonerationActive.motif}</div>
                <div>Mois couverts : {exonerationActive.moisCouverts.join(", ")}</div>
              </div>
            )}

            <div>
              <Label htmlFor="type-exo">Type de dispense</Label>
              <Select
                value={type}
                onValueChange={(v) => handleTypeChange(v as "permanente" | "bourse")}
              >
                <SelectTrigger id="type-exo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanente">Exonération permanente (Octobre à Mai — 8 mois)</SelectItem>
                  <SelectItem value="bourse">Bourse scolaire (Nombre de mois variable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "bourse" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mois couverts par la bourse ({moisSelectionnes.length}/8)</Label>
                  <div className="flex gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => appliquerPreset(3)}
                      className="px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-100 text-gray-600"
                    >
                      3 mois
                    </button>
                    <button
                      type="button"
                      onClick={() => appliquerPreset(6)}
                      className="px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-100 text-gray-600"
                    >
                      6 mois
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoisSelectionnes([...MOIS_SCOLAIRES])}
                      className="px-2 py-0.5 border border-gray-200 rounded hover:bg-gray-100 text-gray-600"
                    >
                      Tous
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {MOIS_SCOLAIRES.map((m) => {
                    const checked = moisSelectionnes.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleMois(m)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border text-center transition ${
                          checked
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="motif">Motif ou justification</Label>
              <textarea
                id="motif"
                required
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Exemple : Boursier d'excellence, enfant du personnel, cas social..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </DialogBody>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {exonerationActive ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRevoquer}
                disabled={isPending}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Révoquer</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending || !motif.trim()}>
                {isPending ? "Enregistrement..." : "Enregistrer la dispense"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
