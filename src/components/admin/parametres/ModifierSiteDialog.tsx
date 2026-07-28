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
import { modifierSite } from "@/actions/donnees-scolaires";

interface ModifierSiteDialogProps {
  siteId: number;
  initialNomSite: string;
  initialInitiale: string;
}

export function ModifierSiteDialog({ siteId, initialNomSite, initialInitiale }: ModifierSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [nomSite, setNomSite] = useState(initialNomSite);
  const [initiale, setInitiale] = useState(initialInitiale);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await modifierSite({ id: siteId, nomSite, initiale });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Site modifié");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-3.5 h-3.5" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="nom_site">Nom du site</Label>
              <Input id="nom_site" required value={nomSite} onChange={(e) => setNomSite(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="initiale">Initiale</Label>
              <Input
                id="initiale"
                required
                maxLength={1}
                className="uppercase w-20"
                value={initiale}
                onChange={(e) => setInitiale(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-gray-400 mt-1">
                Les matricules déjà attribués gardent l&apos;ancienne initiale — seules les nouvelles inscriptions
                utiliseront la nouvelle.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !nomSite || !initiale}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
