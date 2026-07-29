"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InactivityWatcher } from "@/components/shared/InactivityWatcher";
import { deconnexionProfesseurTD, prolongerSessionProfesseurTD } from "@/actions/auth-td";

const TIMEOUT_INACTIVITE_MS = 20 * 60 * 1000;

export function ProfesseurInactivityWatcher() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleTimeout = useCallback(() => {
    startTransition(async () => {
      await deconnexionProfesseurTD();
      router.push("/td/login");
      router.refresh();
    });
  }, [router]);

  const handleActivite = useCallback(() => {
    startTransition(async () => {
      await prolongerSessionProfesseurTD();
    });
  }, []);

  return <InactivityWatcher timeoutMs={TIMEOUT_INACTIVITE_MS} onTimeout={handleTimeout} onActivite={handleActivite} />;
}
