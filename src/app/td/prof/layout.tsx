import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, ClipboardList, HelpCircle, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { getTdProfesseurSession } from "@/lib/session-td";
import { deconnexionProfesseurTD } from "@/actions/auth-td";
import { ProfesseurInactivityWatcher } from "@/components/td/ProfesseurInactivityWatcher";

const NAV = [
  { label: "Tableau de bord", href: "/td/prof/dashboard", icon: LayoutDashboard },
  { label: "Candidatures", href: "/td/prof/candidatures", icon: ClipboardList },
];

/** §5.3/§9 — même schéma de garde que le portail parents : vérification directe de la session, pas de proxy (session custom, pas Supabase Auth). */
export default async function TdProfLayout({ children }: { children: React.ReactNode }) {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    redirect("/td/login");
  }

  async function handleLogout() {
    "use server";
    await deconnexionProfesseurTD();
    redirect("/td/login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <ProfesseurInactivityWatcher />
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-bold text-gray-900 shrink-0">Portail TD</span>
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
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/td/prof/aide" title="Aide" className="text-gray-500 hover:text-gray-700">
              <HelpCircle className="w-4 h-4" />
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
