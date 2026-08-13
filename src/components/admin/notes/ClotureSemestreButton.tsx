"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cloturerSemestre } from "@/actions/moyennes-semestrielles";
import type { Semestre } from "@/lib/constants";

export function ClotureSemestreButton({ semestre }: { semestre: Semestre }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await cloturerSemestre(semestre);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Moyennes du semestre ${semestre} clôturées`);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <RefreshCw className="w-3.5 h-3.5" />
      {isPending ? "Calcul..." : `Clôturer / Recalculer S${semestre}`}
    </Button>
  );
}
