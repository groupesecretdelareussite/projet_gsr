"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { soumettrePostulationTD, retirerPostulationTD } from "@/actions/td-postulations";

interface CandidatureButtonTDProps {
  creneauId: number;
  postulationId: number | null;
  statutValidation: string | null;
}

export function CandidatureButtonTD({ creneauId, postulationId, statutValidation }: CandidatureButtonTDProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function postuler() {
    startTransition(async () => {
      const result = await soumettrePostulationTD(creneauId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Candidature envoyée");
      router.refresh();
    });
  }

  function retirer() {
    if (!postulationId) return;
    if (!window.confirm("Retirer cette candidature ?")) return;
    startTransition(async () => {
      const result = await retirerPostulationTD(postulationId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Candidature retirée");
      router.refresh();
    });
  }

  if (!postulationId) {
    return (
      <Button onClick={postuler} disabled={isPending}>
        {isPending ? "..." : "Postuler"}
      </Button>
    );
  }

  if (statutValidation === "En attente") {
    return (
      <Button variant="outline" onClick={retirer} disabled={isPending}>
        {isPending ? "..." : "Retirer"}
      </Button>
    );
  }

  return null;
}
