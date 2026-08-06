"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { supprimerActualite } from "@/actions/actualites";

export function SupprimerActualiteButton({ id, titre }: { id: number; titre: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm(`Supprimer l'article "${titre}" ?`)) return;
    startTransition(async () => {
      const result = await supprimerActualite(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Article supprimé");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <Trash2 className="w-3.5 h-3.5" />
      <span className={HOVER_ONLY_LABEL}>Supprimer</span>
    </Button>
  );
}
