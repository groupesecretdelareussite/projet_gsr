"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { login } from "@/actions/auth";
import { connexionProfesseurTD } from "@/actions/auth-td";

type TypeCompte = "coordonnateur" | "professeur";

export default function TdLoginPage() {
  const [typeCompte, setTypeCompte] = useState<TypeCompte>("professeur");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const identifiant = String(formData.get("identifiant") ?? "");
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      if (typeCompte === "coordonnateur") {
        const result = await login(identifiant, password);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/td/coord/dashboard");
      } else {
        const result = await connexionProfesseurTD(identifiant, password);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/td/prof/dashboard");
      }
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg border-2 border-primary flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain scale-150" />
          </div>
          <span className="font-bold text-xl text-gray-900">Portail TD</span>
        </div>

        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Connexion</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bon retour.</h1>

        <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-50 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setTypeCompte("professeur");
              setError(null);
            }}
            className={cn(
              "py-2 rounded-md text-sm font-semibold transition-colors",
              typeCompte === "professeur" ? "bg-white shadow-sm text-primary" : "text-gray-500"
            )}
          >
            Professeur
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeCompte("coordonnateur");
              setError(null);
            }}
            className={cn(
              "py-2 rounded-md text-sm font-semibold transition-colors",
              typeCompte === "coordonnateur" ? "bg-white shadow-sm text-primary" : "text-gray-500"
            )}
          >
            Coordonnateur
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="identifiant" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {typeCompte === "coordonnateur" ? "Nom d'utilisateur" : "Email"}
            </label>
            <div className="relative">
              {typeCompte === "coordonnateur" ? (
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              ) : (
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              )}
              <input
                id="identifiant"
                name="identifiant"
                type={typeCompte === "coordonnateur" ? "text" : "email"}
                autoComplete={typeCompte === "coordonnateur" ? "username" : "email"}
                required
                placeholder={typeCompte === "coordonnateur" ? "m.traore" : "prof@exemple.com"}
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2.5"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {typeCompte === "professeur" && (
            <p className="text-xs text-gray-400">Mot de passe oublié ? Contactez le coordonnateur pour une réinitialisation.</p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
            style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
          >
            {isPending ? "Connexion..." : "Se connecter"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-gray-100 mt-8 pt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
