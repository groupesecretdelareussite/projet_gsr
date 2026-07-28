"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { demarrerRevueFinAnnee } from "@/actions/fin-annee";

export function DemarrerRevueButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await demarrerRevueFinAnnee();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Revue de fin d'année démarrée");
      router.refresh();
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      <PlayCircle className="w-4 h-4" />
      {isPending ? "Démarrage..." : "Démarrer la revue de fin d'année"}
    </Button>
  );
}
