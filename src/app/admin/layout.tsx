import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { ScopeProvider } from "@/components/admin/ScopeProvider";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Pas de session : soit la page /admin/login (rendue sans habillage), soit
  // une route protégée déjà interceptée par middleware.ts avant d'arriver ici.
  if (!session) {
    return <>{children}</>;
  }

  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    // Compte désactivé/supprimé entre-temps (§5.1) : session encore valide
    // côté JWT mais plus autorisée applicativement.
    redirect("/admin/login");
  }

  return (
    <ScopeProvider scope={scope}>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </ScopeProvider>
  );
}
