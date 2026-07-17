"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { login } from "@/actions/auth";

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      const result = await login(username, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/tableau-de-bord");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        {/* Logo + titre */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg border-2 border-primary flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain scale-150" />
          </div>
          <span className="font-bold text-xl text-gray-900">Portail Administration</span>
        </div>

        {/* En-tête */}
        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">
          Connexion
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Bon retour.</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Identifiez-vous avec votre compte professionnel pour accéder au tableau de bord.
        </p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Nom d&apos;utilisateur
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="m.traore"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
            style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
          >
            {isPending ? "Connexion..." : "Accéder à la console"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-gray-100 mt-8 pt-6 flex items-center justify-between text-sm">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </Link>
          <a href="tel:+2290196084067" className="text-primary font-semibold hover:underline">
            Besoin d&apos;aide ?
          </a>
        </div>
      </div>

      {/* Bandeau institutionnel */}
      <div
        className="w-full max-w-md mt-6 rounded-2xl overflow-hidden shadow-md relative p-6 flex flex-col justify-end min-h-[110px]"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        <ShieldCheck className="w-5 h-5 text-white/70 absolute top-5 right-5" />
        <span className="text-white font-bold text-sm">Groupe Secret de la Réussite</span>
        <span className="text-white/80 text-xs">Excellence &amp; Intégrité</span>
      </div>

      <p className="text-gray-400 text-xs mt-6">
        © {new Date().getFullYear()} Groupe Secret de la Réussite. Tous droits réservés.
      </p>
    </div>
  );
}
