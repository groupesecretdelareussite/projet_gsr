"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { deconnexionParent } from "@/actions/auth-parent";

export function DeconnexionParentButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await deconnexionParent();
      router.push("/portail-parents");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      {isPending ? "Déconnexion..." : "Se déconnecter"}
    </button>
  );
}
