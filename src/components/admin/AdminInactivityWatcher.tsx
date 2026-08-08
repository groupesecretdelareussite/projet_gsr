"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { InactivityWatcher } from "@/components/shared/InactivityWatcher";
import { logout, prolongerSessionAdmin } from "@/actions/auth";

const TIMEOUT_INACTIVITE_MS = 20 * 60 * 1000;

/**
 * Partagée par /admin et /td/coord (le coordonnateur y réutilise la même
 * session Supabase Auth, §5.3) — `loginPath` permet de renvoyer vers l'écran
 * de connexion du bon portail après déconnexion pour inactivité.
 */
export function AdminInactivityWatcher({ loginPath = "/admin/login" }: { loginPath?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleTimeout = useCallback(() => {
    startTransition(async () => {
      await logout();
      toast.info("Déconnecté après 20 minutes d'inactivité");
      router.push(loginPath);
      router.refresh();
    });
  }, [router, loginPath]);

  const handleActivite = useCallback(() => {
    startTransition(async () => {
      await prolongerSessionAdmin();
    });
  }, []);

  return <InactivityWatcher timeoutMs={TIMEOUT_INACTIVITE_MS} onTimeout={handleTimeout} onActivite={handleActivite} />;
}
