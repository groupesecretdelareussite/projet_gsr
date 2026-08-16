import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LayoutDashboard, CalendarClock, Gavel, Wallet, Settings, HelpCircle, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { logout } from "@/actions/auth";
import { AdminInactivityWatcher } from "@/components/admin/AdminInactivityWatcher";
import { ScrollFadeX } from "@/components/shared/ScrollFadeX";

const NAV = [
  { label: "Tableau de bord", href: "/td/coord/dashboard", icon: LayoutDashboard },
  { label: "Planning", href: "/td/coord/planning", icon: CalendarClock },
  { label: "Arbitrage", href: "/td/coord/arbitrage", icon: Gavel },
  { label: "Finance", href: "/td/coord/finance", icon: Wallet },
  { label: "Configuration", href: "/td/coord/config/zones", icon: Settings },
];

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

  async function handleLogout() {
    "use server";
    await logout();
    redirect("/td/login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-bold text-gray-900 shrink-0">Portail TD</span>
            <ScrollFadeX className="min-w-0">
              <nav className="flex items-center gap-1 overflow-x-auto">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    className="flex items-center justify-center sm:justify-start gap-1.5 w-10 h-10 sm:w-auto sm:px-3 sm:py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors whitespace-nowrap"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </ScrollFadeX>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin/aide" title="Aide" className="p-2.5 -m-2.5 sm:p-0 sm:m-0 rounded-lg text-gray-500 hover:text-gray-700">
              <HelpCircle className="w-4 h-4" />
            </Link>
            <Link href="/admin/tableau-de-bord" className="text-xs text-gray-500 hover:text-gray-700 hidden sm:inline">
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
              Admin GSR
            </Link>
            <form action={handleLogout}>
              <button
                type="submit"
                aria-label="Déconnexion"
                className="flex items-center gap-1 p-2.5 -m-2.5 sm:p-0 sm:m-0 rounded-lg text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      <Toaster richColors position="top-right" />
      <AdminInactivityWatcher loginPath="/td/login" />
    </div>
  );
}
