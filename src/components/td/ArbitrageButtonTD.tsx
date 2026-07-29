"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { traiterArbitrageTD } from "@/actions/td-arbitrage";

export function ArbitrageButtonTD({ creneauId, professeurId }: { creneauId: number; professeurId: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!window.confirm("Valider ce professeur pour ce créneau ? Les autres candidatures seront automatiquement refusées.")) return;
    startTransition(async () => {
      const result = await traiterArbitrageTD(creneauId, professeurId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Professeur validé sur le créneau");
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      <Check className="w-3.5 h-3.5" />
      Valider
    </Button>
  );
}
