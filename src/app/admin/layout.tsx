import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { ScopeProvider } from "@/components/admin/ScopeProvider";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { AdminInactivityWatcher } from "@/components/admin/AdminInactivityWatcher";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Pas de session : soit la page /admin/login (rendue sans habillage), soit
  // une route protégée déjà interceptée par proxy.ts avant d'arriver ici.
  if (!session) {
    return <>{children}</>;
  }

  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    // Compte désactivé/supprimé ou profil inaccessible : déconnexion propre pour éviter
    // toute boucle de redirection infinie (ERR_TOO_MANY_REDIRECTS) avec le middleware proxy.
    await supabase.auth.signOut();
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
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
      <AdminInactivityWatcher />
    </ScopeProvider>
  );
}
