"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { supprimerSite } from "@/actions/donnees-scolaires";

export function SupprimerSiteDialog({ siteId, nomSite }: { siteId: number; nomSite: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await supprimerSite(siteId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${nomSite} supprimé`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Supprimer</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer {nomSite}</DialogTitle>
          <DialogDescription>
            Action irréversible. Impossible si ce site a encore des classes rattachées — supprimez-les d&apos;abord.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Suppression..." : "Confirmer la suppression"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
