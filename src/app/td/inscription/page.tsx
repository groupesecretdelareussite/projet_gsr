import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { InscriptionProfesseurForm } from "@/components/td/InscriptionProfesseurForm";

export const metadata = {
  title: "Inscription Enseignant — Portail TD GSR",
  description: "Formulaire d'inscription pour les enseignants de Travaux Dirigés du Groupe Secret de la Réussite.",
};

export default async function TdInscriptionPage() {
  const supabaseAdmin = createServiceRoleClient();

  const [{ data: zones }, { data: matieres }] = await Promise.all([
    supabaseAdmin.schema("td").from("zones").select("id, nom_zone").order("nom_zone"),
    supabaseAdmin.schema("td").from("matieres_td").select("id, nom_matiere").order("nom_matiere"),
  ]);

  const zonesOptions = (zones ?? []).map((z) => ({ id: z.id, nom: z.nom_zone }));
  const matieresOptions = (matieres ?? []).map((m) => ({ id: m.id, nom: m.nom_matiere }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10">
        {/* Header avec Logo */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg border-2 border-primary flex items-center justify-center overflow-hidden shrink-0">
              <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain scale-150" />
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900 block leading-tight">Portail TD</span>
              <span className="text-xs text-gray-400">Groupe Secret de la Réussite</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <GraduationCap className="w-4 h-4" />
            <span>Enseignants</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5">Rejoindre l&apos;équipe</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Créer votre compte.</h1>
          <p className="text-xs text-gray-500 mt-1">
            Renseignez vos coordonnées pour la création de votre espace prof.
          </p>
        </div>

        <InscriptionProfesseurForm zones={zonesOptions} matieres={matieresOptions} />

        <div className="border-t border-gray-100 mt-6 pt-5 flex items-center justify-between text-xs text-gray-400">
          <Link href="/td/login" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
          </Link>
          <Link href="/" className="hover:text-gray-600 transition-colors">
            Site officiel GSR
          </Link>
        </div>
      </div>
    </div>
  );
}
