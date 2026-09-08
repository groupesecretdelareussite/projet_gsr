import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { getTdProfesseurSession } from "@/lib/session-td";
import { ProfesseurInactivityWatcher } from "@/components/td/ProfesseurInactivityWatcher";
import { TdProfHeader } from "@/components/td/TdProfHeader";

/** §5.3/§9 — même schéma de garde que le portail parents : vérification directe de la session, pas de proxy (session custom, pas Supabase Auth). */
export default async function TdProfLayout({ children }: { children: React.ReactNode }) {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    redirect("/td/login");
  }

  return (
    <div className="min-h-screen bg-surface">
      <ProfesseurInactivityWatcher />
      <TdProfHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
