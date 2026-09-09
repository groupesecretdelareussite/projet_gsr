import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth-scope";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChatContainer } from "@/components/admin/agent-ia/ChatContainer";

const ROLES_AUTORISES = ["coordonnateur", "comptable", "superviseur"];

export default async function AgentIAPage() {
  const supabase = await createClient();
  let scope;
  try {
    scope = await getUserScope(supabase);
  } catch {
    redirect("/admin/login");
  }

  if (!ROLES_AUTORISES.includes(scope.role)) {
    redirect("/admin/tableau-de-bord");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <PageHeader
        title="Agent IA — GSR"
        subtitle="Assistant analytique et décisionnel en lecture seule propulsé par Gemini"
        decorativeIcon={Bot}
      />
      <div className="flex-1 min-h-0 pb-2">
        <ChatContainer />
      </div>
    </div>
  );
}
