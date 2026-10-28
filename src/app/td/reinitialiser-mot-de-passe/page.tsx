"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { JaugeMotDePasse } from "@/components/td/JaugeMotDePasse";
import { reinitialiserMotDePasseAvecTokenProfTD } from "@/actions/auth-td";

function ReinitialiserMotDePasseProfForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mdpCorrespondent = confirmation.length === 0 || nouveauMdp === confirmation;
  const peutSoumettre =
    token.length > 0 &&
    nouveauMdp.length >= 8 &&
    nouveauMdp === confirmation &&
    !isPending;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError("Jeton de réinitialisation manquant. Veuillez recliquer sur le lien reçu par email.");
      return;
    }
    if (nouveauMdp !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (nouveauMdp.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await reinitialiserMotDePasseAvecTokenProfTD(token, nouveauMdp);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("Votre mot de passe a été réinitialisé avec succès !");
      router.push("/td/login");
    });
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Aucun jeton de réinitialisation n&apos;a été détecté dans l&apos;adresse. Veuillez recliquer sur le lien complet reçu dans votre boîte de messagerie.
        </p>
        <Link
          href="/td/mot-de-passe-oublie"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition"
        >
          Faire une nouvelle demande
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Espace Professeurs</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h1>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        Définissez un mot de passe sécurisé d&apos;au moins 8 caractères.
      </p>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nouveau mot de passe */}
        <div>
          <label htmlFor="nouveauMdp" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Nouveau mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="nouveauMdp"
              name="nouveauMdp"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="••••••••"
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
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
          {/* Jauge de robustesse */}
          <JaugeMotDePasse motDePasse={nouveauMdp} />
        </div>

        {/* Confirmation */}
        <div>
          <label htmlFor="confirmation" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Confirmer le mot de passe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="confirmation"
              name="confirmation"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="••••••••"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
          {!mdpCorrespondent && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!peutSoumettre}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none mt-2"
          style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
        >
          {isPending ? "Enregistrement..." : "Valider le nouveau mot de passe"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </>
  );
}

export default function ReinitialiserMotDePasseProfPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-lg border-2 border-primary flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo.png" alt="GSR Logo" width={28} height={28} className="object-contain scale-150" />
          </div>
          <span className="font-bold text-xl text-gray-900">Portail TD</span>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-8 text-gray-400 text-sm">
              Chargement du formulaire...
            </div>
          }
        >
          <ReinitialiserMotDePasseProfForm />
        </Suspense>

        <div className="border-t border-gray-100 mt-8 pt-6">
          <Link href="/td/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
