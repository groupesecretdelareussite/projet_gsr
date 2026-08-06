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
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <span className="font-bold text-gray-900 shrink-0">
              Portail TD — {session.prenom} {session.nom}
            </span>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/td/prof/aide" title="Aide" className="text-gray-500 hover:text-gray-700">
              <HelpCircle className="w-4 h-4" />
            </Link>
            <form action={handleLogout}>
              <button type="submit" className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion
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
