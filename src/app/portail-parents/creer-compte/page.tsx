"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IdCard, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParentsAuthPanel } from "@/components/parents/ParentsAuthPanel";
import { creerCompteParent } from "@/actions/auth-parent";

function forceMotDePasse(motDePasse: string): { label: string; niveau: number; couleur: string } {
  if (motDePasse.length === 0) return { label: "", niveau: 0, couleur: "bg-gray-200" };
  if (motDePasse.length < 8) return { label: "Trop court (min. 8 caractères)", niveau: 1, couleur: "bg-red-400" };

  const varietes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(motDePasse)).length;
  if (varietes <= 2) return { label: "Moyen", niveau: 2, couleur: "bg-amber-400" };
  return { label: "Fort", niveau: 3, couleur: "bg-green-500" };
}

export default function CreerCompteParentPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const force = forceMotDePasse(motDePasse);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (motDePasse !== confirmation) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const matricule = String(formData.get("matricule") ?? "").trim().toUpperCase();

    startTransition(async () => {
      const result = await creerCompteParent({ matricule, motDePasse });
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
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Première connexion</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Créer votre compte</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Utilisez le matricule de votre enfant, communiqué par le groupe.
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
              <label htmlFor="mot_de_passe" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="mot_de_passe"
                  name="mot_de_passe"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="Au moins 8 caractères"
                  className="w-full pl-4 pr-11 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2.5"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {motDePasse.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className={cn("flex-1 rounded-full transition-colors", n <= force.niveau ? force.couleur : "bg-gray-100")} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{force.label}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmation" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmation"
                name="confirmation"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="w-full pl-4 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none bg-primary-gradient"
            >
              {isPending ? "Création..." : "Créer mon compte"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-gray-100 mt-8 pt-6">
            <Link
              href="/portail-parents"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
