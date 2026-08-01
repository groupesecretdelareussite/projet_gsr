"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marquerToutesNotificationsLues } from "@/actions/notifications";

/** `ids` = tous les non-lus dans le périmètre de l'utilisateur, pas seulement ceux affichés à l'écran (filtre "lues" possible). */
export function ToutMarquerLuButton({ ids }: { ids: number[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await marquerToutesNotificationsLues(ids);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Toutes les notifications marquées comme lues");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <CheckCheck className="w-3.5 h-3.5" />
      Tout marquer comme lu ({ids.length})
    </Button>
  );
}
