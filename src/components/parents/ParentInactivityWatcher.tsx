"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InactivityWatcher } from "@/components/shared/InactivityWatcher";
import { deconnexionParent, prolongerSessionParent } from "@/actions/auth-parent";

const TIMEOUT_INACTIVITE_MS = 20 * 60 * 1000;

export function ParentInactivityWatcher() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleTimeout = useCallback(() => {
    startTransition(async () => {
      await deconnexionParent();
      router.push("/portail-parents");
      router.refresh();
    });
  }, [router]);

  const handleActivite = useCallback(() => {
    startTransition(async () => {
      await prolongerSessionParent();
    });
  }, []);

  return <InactivityWatcher timeoutMs={TIMEOUT_INACTIVITE_MS} onTimeout={handleTimeout} onActivite={handleActivite} />;
}
