"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supprimerDepense } from "@/actions/depenses";

export function SupprimerDepenseButton({ depenseId, libelle }: { depenseId: number; libelle: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(`Supprimer la dépense "${libelle}" ?`)) return;
    startTransition(async () => {
      const result = await supprimerDepense(depenseId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dépense supprimée");
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
