"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
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
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { supprimerEleves } from "@/actions/eleves";

export interface EleveCibleSuppression {
  id: number;
  nom: string;
  prenoms: string;
  matricule?: string;
  classe?: string;
}

interface SupprimerElevesDialogProps {
  eleves: EleveCibleSuppression[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  redirectTo?: string;
}

export function SupprimerElevesDialog({
  eleves,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
  redirectTo,
}: SupprimerElevesDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isMultiple = eleves.length > 1;
  const titre = isMultiple
    ? `Supprimer définitivement ${eleves.length} élèves`
    : `Supprimer définitivement cet élève`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || eleves.length === 0) return;

    const ids = eleves.map((e) => e.id);

    startTransition(async () => {
      const result = await supprimerEleves(ids, password.trim());
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isMultiple
          ? `${result.count ?? eleves.length} élèves supprimés définitivement`
          : `Élève supprimé définitivement`
      );

      setOpen(false);
      setPassword("");
      if (onSuccess) onSuccess();

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm" title="Supprimer définitivement">
            <Trash2 className="w-3.5 h-3.5" />
            <span className={HOVER_ONLY_LABEL}>Supprimer</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-red-700">{titre}</DialogTitle>
          </div>
          <DialogDescription>
            Cette action est <strong>irréversible</strong>. Elle effacera définitivement le dossier scolaire (notes, présences, moyennes, compte parent).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Récapitulatif des élèves */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-800 space-y-1.5">
              <p className="font-semibold">
                {isMultiple ? "Élèves ciblés par la suppression :" : "Élève ciblé :"}
              </p>
              <div className="max-h-36 overflow-y-auto divide-y divide-red-200/50">
                {eleves.map((e) => (
                  <div key={e.id} className="py-1 flex justify-between items-center gap-2">
                    <span className="font-medium truncate">
                      {e.nom} {e.prenoms}
                    </span>
                    <span className="text-red-600 font-mono text-[11px] shrink-0">
                      {e.matricule ? `${e.matricule}` : ""}
                      {e.classe ? ` (${e.classe})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Note : si un élève a déjà des paiements enregistrés, l'opération sera automatiquement bloquée pour préserver la comptabilité.
            </div>

            <div>
              <Label htmlFor="admin-password">Mot de passe du coordonnateur</Label>
              <Input
                id="admin-password"
                type="password"
                required
                autoFocus
                placeholder="Entrez votre mot de passe pour confirmer"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setPassword("");
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || !password.trim() || eleves.length === 0}
            >
              {isPending
                ? "Suppression en cours..."
                : isMultiple
                ? `Confirmer (${eleves.length})`
                : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
