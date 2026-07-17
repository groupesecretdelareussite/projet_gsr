"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { suspendreEleve } from "@/actions/eleves";
import { RAISON_LABELS } from "@/lib/constants";

const RAISONS = ["maladie", "renvoi", "autre"] as const;

export function SuspendreDialog({ eleveId, nomComplet }: { eleveId: number; nomComplet: string }) {
  const [open, setOpen] = useState(false);
  const [raison, setRaison] = useState<(typeof RAISONS)[number] | "">("");
  const [motif, setMotif] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raison || !motif.trim()) return;

    startTransition(async () => {
      const result = await suspendreEleve(eleveId, raison, motif.trim());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Élève suspendu");
      setOpen(false);
      setRaison("");
      setMotif("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <UserX className="w-3.5 h-3.5" />
          Suspendre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspendre {nomComplet}</DialogTitle>
          <DialogDescription>Cette action est réversible via une réinscription.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="raison">Raison</Label>
              <Select value={raison} onValueChange={(v) => setRaison(v as (typeof RAISONS)[number])}>
                <SelectTrigger id="raison">
                  <SelectValue placeholder="Choisir une raison" />
                </SelectTrigger>
                <SelectContent>
                  {RAISONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {RAISON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="motif">Motif</Label>
              <textarea
                id="motif"
                required
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending || !raison || !motif.trim()}>
              {isPending ? "Suspension..." : "Confirmer la suspension"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
