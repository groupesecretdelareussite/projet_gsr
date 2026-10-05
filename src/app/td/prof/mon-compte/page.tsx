import { redirect } from "next/navigation";
import { User, Mail, Phone, MapPin, BookOpen, ShieldCheck } from "lucide-react";
import { getTdProfesseurSession } from "@/lib/session-td";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { MonCompteProfForm } from "@/components/td/MonCompteProfForm";

interface ProfData {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  zones?: { nom_zone: string } | { nom_zone: string }[] | null;
  matieres_td?: { nom_matiere: string } | { nom_matiere: string }[] | null;
}

export default async function MonCompteProfPage() {
  const session = await getTdProfesseurSession();
  if (!session.professeurId) {
    redirect("/td/login");
  }

  const supabaseAdmin = createServiceRoleClient();
  const { data } = await supabaseAdmin
    .schema("td")
    .from("professeurs")
    .select("id, nom, prenom, email, telephone, zones(nom_zone), matieres_td(nom_matiere)")
    .eq("id", session.professeurId)
    .maybeSingle();

  const prof = data as unknown as ProfData | null;

  const nomZone = Array.isArray(prof?.zones)
    ? prof?.zones[0]?.nom_zone
    : prof?.zones?.nom_zone;

  const nomMatiere = Array.isArray(prof?.matieres_td)
    ? prof?.matieres_td[0]?.nom_matiere
    : prof?.matieres_td?.nom_matiere;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon compte"
        subtitle="Gérer vos informations personnelles et sécuriser votre accès au portail TD"
      />

      {/* Carte Informations Personnelles (Lecture seule) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs max-w-lg">
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {prof?.prenom?.charAt(0)?.toUpperCase()}
            {prof?.nom?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">
              {prof ? `${prof.prenom} ${prof.nom}` : `${session.prenom ?? ""} ${session.nom ?? ""}`}
            </h2>
            <div className="flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compte Professeur Actif</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-gray-50">
            <span className="flex items-center gap-2 text-gray-500 font-medium">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Email de connexion
            </span>
            <span className="font-semibold text-gray-800">{prof?.email ?? "—"}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-gray-50">
            <span className="flex items-center gap-2 text-gray-500 font-medium">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              Téléphone
            </span>
            <span className="font-semibold text-gray-800">{prof?.telephone ?? "—"}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-gray-50">
            <span className="flex items-center gap-2 text-gray-500 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-gray-400" />
              Matière principale
            </span>
            <span className="font-semibold text-gray-800">{nomMatiere ?? "—"}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-gray-50">
            <span className="flex items-center gap-2 text-gray-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Zone géographique
            </span>
            <span className="font-semibold text-gray-800">{nomZone ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Formulaire de changement de mot de passe */}
      <MonCompteProfForm />
    </div>
  );
}
