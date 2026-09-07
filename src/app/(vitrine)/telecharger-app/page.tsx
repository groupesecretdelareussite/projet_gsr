import Image from "next/image";
import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Télécharger l'application mobile GSR Staff & Enseignants",
  description: "Application mobile officielle Android du Groupe Secret de la Réussite pour le personnel administratif et les professeurs de TD.",
};

export default function TelechargerAppPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4">
            <Image src="/logo.png" alt="GSR Logo" width={64} height={64} className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Application Mobile GSR
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            Portail dédié au personnel administratif (coordonnateurs, superviseurs, chefs de site) et aux enseignants TD.
          </p>
        </div>

        {/* Carte Téléchargement Principal */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" /> Version Officielle Android (APK)
              </div>
              <h2 className="text-2xl font-bold text-slate-900">GSR Staff & TD v1.0.0</h2>
              <p className="text-slate-600 text-sm max-w-md">
                Effectuez la prise de présence, enregistrez les paiements, saisissez les notes et postulez aux séances de TD directement depuis votre smartphone.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 justify-center sm:justify-start">
                <span>Format : Fichier APK Android</span>
                <span>•</span>
                <span>Taille : ~35 Mo</span>
                <span>•</span>
                <span>Compatible : Android 8.0+</span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-3 w-full sm:w-auto">
              <a
                href="/app/gsr-staff.apk"
                download
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all text-base hover:scale-105"
              >
                <Download className="w-5 h-5" /> Télécharger l'APK
              </a>
              <span className="text-xs text-slate-400">Téléchargement direct et gratuit</span>
            </div>
          </div>
        </div>

        {/* Guide d'installation en 3 étapes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Comment installer l'application en 3 étapes ?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Télécharger le fichier</h3>
              <p className="text-slate-600 text-sm">
                Appuyez sur le bouton vert ci-dessus. Votre navigateur peut afficher un avertissement standard concernant les fichiers APK, appuyez sur <strong>« Télécharger quand même »</strong>.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-black text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Autoriser l'installation</h3>
              <p className="text-slate-600 text-sm">
                Ouvrez le fichier téléchargé. Si Android vous le demande, activez l'autorisation <strong>« Sources inconnues »</strong> ou <strong>« Installer des applications inconnues »</strong> pour votre navigateur ou explorateur de fichiers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Se connecter</h3>
              <p className="text-slate-600 text-sm">
                Ouvrez l'application <strong>GSR Staff</strong> et connectez-vous :
                soit avec vos identifiants Staff Admin, soit avec votre compte Enseignant TD.
              </p>
            </div>
          </div>
        </div>

        {/* Assistance */}
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-emerald-950">Besoin d'aide pour l'installation ?</h3>
            <p className="text-emerald-800 text-sm mt-1">
              Contactez la coordination technique GSR pour vous accompagner dans la prise en main.
            </p>
          </div>
          <Link
            href="https://wa.me/2290196084067"
            target="_blank"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl whitespace-nowrap transition-colors"
          >
            Assistance WhatsApp
          </Link>
        </div>
      </div>
    </div>
  );
}
