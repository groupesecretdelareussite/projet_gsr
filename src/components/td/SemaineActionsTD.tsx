"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publierSemaineTD, cloturerSemaineTD } from "@/actions/td-semaines";
import { ModifierSemaineTDDialog } from "@/components/td/ModifierSemaineTDDialog";
import { SupprimerSemaineTDDialog } from "@/components/td/SupprimerSemaineTDDialog";

interface SemaineActionsTDProps {
  semaineId: number;
  statut: string;
  libelle: string;
  dateDebut: string;
}

export function SemaineActionsTD({ semaineId, statut, libelle, dateDebut }: SemaineActionsTDProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function publier() {
    startTransition(async () => {
      const result = await publierSemaineTD(semaineId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Semaine publiée — les professeurs peuvent maintenant postuler");
      router.refresh();
    });
  }

  function cloturer() {
    if (!window.confirm("Clôturer cette semaine ? Cette action est irréversible : les créneaux non pourvus seront fermés.")) return;
    startTransition(async () => {
      const result = await cloturerSemaineTD(semaineId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Semaine clôturée");
      router.refresh();
    });
  }

  if (statut === "brouillon") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ModifierSemaineTDDialog semaineId={semaineId} initialLibelle={libelle} initialDateDebut={dateDebut} />
        <SupprimerSemaineTDDialog semaineId={semaineId} libelle={libelle} />
        <Button size="sm" onClick={publier} disabled={isPending}>
          <Send className="w-3.5 h-3.5" />
          Publier la semaine
        </Button>
      </div>
    );
  }

  if (statut === "publiee") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <SupprimerSemaineTDDialog semaineId={semaineId} libelle={libelle} />
        <Button size="sm" variant="destructive" onClick={cloturer} disabled={isPending}>
          <Lock className="w-3.5 h-3.5" />
          Clôturer la semaine
        </Button>
      </div>
    );
  }

  return null;
}
