"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { definirNouveauMotDePasse } from "@/actions/auth";

export default function ReinitialiserMotDePassePage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const motDePasse = String(formData.get("motDePasse") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (motDePasse !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }

    startTransition(async () => {
      const result = await definirNouveauMotDePasse(motDePasse);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/login");
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg border-2 border-primary flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain scale-150" />
          </div>
          <span className="font-bold text-xl text-gray-900">Portail Administration</span>
        </div>

        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Nouveau mot de passe</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Choisissez un mot de passe</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">Au moins 8 caractères.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="motDePasse" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="motDePasse"
                name="motDePasse"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••••"
                className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
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

          <div>
            <label htmlFor="confirmation" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Confirmez le mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="confirmation"
                name="confirmation"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
            style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
          >
            {isPending ? "Enregistrement..." : "Valider le nouveau mot de passe"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
