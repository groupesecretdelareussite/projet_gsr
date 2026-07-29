"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supprimerCreneauTD } from "@/actions/td-creneaux";

export function SupprimerCreneauTDButton({ creneauId }: { creneauId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm("Supprimer ce créneau ?")) return;
    startTransition(async () => {
      const result = await supprimerCreneauTD(creneauId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Créneau supprimé");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <Trash2 className="w-3.5 h-3.5" />
      Supprimer
    </Button>
  );
}
