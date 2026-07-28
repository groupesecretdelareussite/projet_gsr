"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { InactivityWatcher } from "@/components/shared/InactivityWatcher";
import { logout } from "@/actions/auth";

const TIMEOUT_INACTIVITE_MS = 20 * 60 * 1000;

export function AdminInactivityWatcher() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleTimeout = useCallback(() => {
    startTransition(async () => {
      await logout();
      toast.info("Déconnecté après 20 minutes d'inactivité");
      router.push("/admin/login");
      router.refresh();
    });
  }, [router]);

  return <InactivityWatcher timeoutMs={TIMEOUT_INACTIVITE_MS} onTimeout={handleTimeout} />;
}
