import Link from "next/link";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { AdminInactivityWatcher } from "@/components/admin/AdminInactivityWatcher";
import { TdCoordHeader } from "@/components/td/TdCoordHeader";

/**
 * §5.3/§1.1 GSR_ARCHITECTURE.md — le coordonnateur réutilise sa session
 * Supabase Auth existante (proxy.ts garantit déjà qu'une session existe
 * ici) ; seul le rôle reste à vérifier, le portail TD n'étant ouvert qu'au
 * coordonnateur + aux professeurs (jamais comptable/superviseur/chef_site/secretaire).
 */
export default async function TdCoordLayout({ children }: { children: React.ReactNode }) {
  const scope = await getUserScope(await createClient());

  if (scope.role !== "coordonnateur") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="text-center">
          <p className="text-gray-900 font-semibold mb-2">Non autorisé</p>
          <p className="text-gray-500 text-sm mb-6">Le portail TD est réservé au coordonnateur.</p>
          <Link href="/admin/tableau-de-bord" className="text-primary font-semibold text-sm hover:underline">
            Retour à l&apos;admin GSR
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <TdCoordHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      <Toaster richColors position="top-right" />
      <AdminInactivityWatcher loginPath="/td/login" />
    </div>
  );
}
