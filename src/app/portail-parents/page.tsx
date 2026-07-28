"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IdCard, Eye, EyeOff, ArrowRight, ArrowLeft, UserPlus } from "lucide-react";
import { ParentsAuthPanel } from "@/components/parents/ParentsAuthPanel";
import { connexionParent } from "@/actions/auth-parent";

export default function ConnexionParentPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const matricule = String(formData.get("matricule") ?? "").trim().toUpperCase();
    const motDePasse = String(formData.get("mot_de_passe") ?? "");

    startTransition(async () => {
      const result = await connexionParent(matricule, motDePasse);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/portail-parents/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen flex">
      <ParentsAuthPanel />

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Connexion</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Espace Parents</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Suivez la progression de votre enfant en toute simplicité.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="matricule" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Matricule de l&apos;élève
              </label>
              <div className="relative">
                <input
                  id="matricule"
                  name="matricule"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Ex : J07262625"
                  className="w-full pl-4 pr-11 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition uppercase"
                />
                <IdCard className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="mot_de_passe" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Mot de passe
                </label>
                <span
                  title="Contactez l'établissement pour une réinitialisation"
                  className="text-xs text-gray-400 cursor-help"
                >
                  Mot de passe oublié ?
                </span>
              </div>
              <div className="relative">
                <input
                  id="mot_de_passe"
                  name="mot_de_passe"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Votre mot de passe"
                  className="w-full pl-4 pr-11 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none bg-primary-gradient"
            >
              {isPending ? "Connexion..." : "Se connecter"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-gray-100 mt-8 pt-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Retour au site
            </Link>

            <Link
              href="/portail-parents/creer-compte"
              className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 text-sm text-gray-700 hover:bg-primary/10 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-primary" />
              Première connexion ? <span className="text-primary font-semibold">Créer un compte</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6 text-xs text-gray-300">
            <span>Mentions légales</span>
            <span>•</span>
            <span>Aide</span>
          </div>
        </div>
      </div>
    </div>
  );
}
