"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reinscrireEleve } from "@/actions/eleves";

export function ReinscrireButton({ eleveId, montantDu }: { eleveId: number; montantDu: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (montantDu > 0) {
      const ok = window.confirm(
        `Cet élève a un montant dû de ${montantDu} F. Confirmer la réinscription malgré tout ?`
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const result = await reinscrireEleve(eleveId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Élève réinscrit");
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      <UserCheck className="w-3.5 h-3.5" />
      {isPending ? "..." : "Réinscrire"}
    </Button>
  );
}
