"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { marquerNotificationLue } from "@/actions/notifications";

export function MarquerLuButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await marquerNotificationLue(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <Check className="w-3.5 h-3.5" />
      <span className={HOVER_ONLY_LABEL}>Marquer lu</span>
    </Button>
  );
}
