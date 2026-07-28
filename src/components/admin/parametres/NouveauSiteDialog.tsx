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
import { creerSite } from "@/actions/donnees-scolaires";

export function NouveauSiteDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [nomSite, setNomSite] = useState("");
  const [initiale, setInitiale] = useState("");

  function reset() {
    setNomSite("");
    setInitiale("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await creerSite({ nomSite, initiale });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Site créé");
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
          Nouveau site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="nom_site">Nom du site</Label>
              <Input id="nom_site" required value={nomSite} onChange={(e) => setNomSite(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="initiale">Initiale (1 caractère, sert au matricule des élèves)</Label>
              <Input
                id="initiale"
                required
                maxLength={1}
                className="uppercase w-20"
                value={initiale}
                onChange={(e) => setInitiale(e.target.value.toUpperCase())}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !nomSite || !initiale}>
              {isPending ? "Création..." : "Créer le site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
