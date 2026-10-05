import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { ScopeProvider } from "@/components/admin/ScopeProvider";
import { AdminSidebarProvider } from "@/components/admin/AdminSidebarContext";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { AdminInactivityWatcher } from "@/components/admin/AdminInactivityWatcher";
import { FloatingAgentWidget } from "@/components/admin/agent-ia/FloatingAgentWidget";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname");

  // Les écrans d'authentification autonomes (connexion, mot de passe oublié, réinitialisation)
  // sont rendus sans la sidebar et la topbar d'administration.
  if (
    pathname === "/admin/reinitialiser-mot-de-passe" ||
    pathname === "/admin/mot-de-passe-oublie" ||
    pathname === "/admin/login"
  ) {
    return <>{children}</>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pas d'utilisateur : rendu sans habillage
  if (!user) {
    return <>{children}</>;
  }

  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    // Compte désactivé/supprimé ou profil inaccessible : redirection vers la connexion.
    // proxy.ts purgera les cookies obsolètes lors de la visite de /admin/login.
    redirect("/admin/login");
  }

  const { data: anneeEnPause } = await supabase
    .from("annees_scolaires")
    .select("libelle")
    .eq("statut", "en_pause")
    .maybeSingle();

  let sitesSuperviseur: { id: number; nom_site: string }[] = [];
  if (scope.role === "superviseur" && scope.siteIds.length > 0) {
    const { data } = await supabase.from("sites").select("id, nom_site").in("id", scope.siteIds).order("nom_site");
    sitesSuperviseur = data ?? [];
  }

  return (
    <ScopeProvider scope={scope}>
      <AdminSidebarProvider>
        <div className="flex min-h-screen bg-surface">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar sitesSuperviseur={sitesSuperviseur} />
            {anneeEnPause && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Revue de fin d&apos;année en cours ({anneeEnPause.libelle}) — certaines actions habituelles peuvent être
                affectées tant que la validation n&apos;est pas terminée.
              </div>
            )}
            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
        <AdminInactivityWatcher />
        <FloatingAgentWidget />
      </AdminSidebarProvider>
    </ScopeProvider>
  );
}
