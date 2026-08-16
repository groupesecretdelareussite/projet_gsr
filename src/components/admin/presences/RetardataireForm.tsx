"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EleveAutocomplete, type EleveResultat } from "@/components/admin/EleveAutocomplete";
import { marquerRetardataire } from "@/actions/presences";

export function RetardataireForm() {
  const [isPending, startTransition] = useTransition();
  const [eleve, setEleve] = useState<EleveResultat | null>(null);

  function marquer() {
    if (!eleve) return;
    startTransition(async () => {
      const result = await marquerRetardataire({ eleveId: eleve.id });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${eleve.nom} ${eleve.prenoms} marqué présent`);
      setEleve(null);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 max-w-xl">
      <p className="text-sm text-gray-500">
        Un élève arrivé après l&apos;appel du jour ? Recherchez-le pour le marquer présent aujourd&apos;hui.
      </p>
      <EleveAutocomplete eleve={eleve} onChange={setEleve} />
      <Button onClick={marquer} disabled={!eleve || isPending}>
        {isPending ? "Enregistrement..." : "Marquer présent"}
      </Button>
    </div>
  );
}
