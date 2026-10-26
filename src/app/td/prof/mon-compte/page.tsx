import { redirect } from "next/navigation";
import { getTdProfesseurSession } from "@/lib/session-td";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { MonProfilProfForm } from "@/components/td/MonProfilProfForm";
import { MonCompteProfForm } from "@/components/td/MonCompteProfForm";

interface ProfData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  zone_id: number;
  matiere_principale_id: number;
}

export default async function MonCompteProfPage() {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    redirect("/td/login");
  }

  const supabaseAdmin = createServiceRoleClient();
  const [{ data: profData }, { data: zonesData }, { data: matieresData }] = await Promise.all([
    supabaseAdmin
      .schema("td")
      .from("professeurs")
      .select("id, nom, prenom, email, telephone, zone_id, matiere_principale_id")
      .eq("id", session.professeurId)
      .maybeSingle(),
    supabaseAdmin.schema("td").from("zones").select("id, nom_zone").order("nom_zone"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere"),
  ]);

  const prof = profData as ProfData | null;
  const zonesOptions = (zonesData ?? []).map((z) => ({ id: z.id, nom: z.nom_zone }));
  const matieresOptions = (matieresData ?? []).map((m) => ({ id: m.id, nom: m.nom_matiere }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon compte"
        subtitle="Gérer vos informations personnelles et sécuriser votre accès au portail TD"
      />

      {/* Formulaire de modification des informations personnelles */}
      <MonProfilProfForm
        initialNom={prof?.nom ?? ""}
        initialPrenom={prof?.prenom ?? ""}
        initialTelephone={prof?.telephone ?? ""}
        initialEmail={prof?.email ?? ""}
        initialZoneId={prof?.zone_id ?? 0}
        initialMatiereId={prof?.matiere_principale_id ?? 0}
        zones={zonesOptions}
        matieres={matieresOptions}
      />

      {/* Formulaire de changement de mot de passe */}
      <MonCompteProfForm />
    </div>
  );
}
