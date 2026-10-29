"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, KeyRound, ArrowRight, ArrowLeft, LifeBuoy } from "lucide-react";
import { verifierCodeMfa, verifierCodeSecours, logout } from "@/actions/auth";
import { CONTACTS_GSR, genererLienWhatsAppSupport } from "@/lib/constants";

export default function Verifier2faPage() {
  const [modeSecours, setModeSecours] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCodeChange(val: string) {
    if (!modeSecours) {
      // TOTP: chiffres uniquement, formatage visuel dynamique "123 456"
      const digits = val.replace(/\D/g, "").slice(0, 6);
      if (digits.length <= 3) {
        setCode(digits);
      } else {
        setCode(`${digits.slice(0, 3)} ${digits.slice(3)}`);
      }
    } else {
      // Code de secours : majuscules/chiffres, formatage visuel "XXXX-XXXX"
      const chars = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
      if (chars.length <= 4) {
        setCode(chars);
      } else {
        setCode(`${chars.slice(0, 4)}-${chars.slice(4)}`);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanCode = modeSecours ? code.trim() : code.replace(/\s+/g, "").trim();
    if (!cleanCode) return;

    startTransition(async () => {
      const result = modeSecours
        ? await verifierCodeSecours(cleanCode)
        : await verifierCodeMfa(cleanCode);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/admin/tableau-de-bord");
      router.refresh();
    });
  }

  function handleAnnuler() {
    startTransition(async () => {
      await logout();
      router.push("/admin/login");
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
        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Sécurité renforcée (2FA)
        </p>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {modeSecours ? "Code de secours." : "Deuxième facteur."}
        </h1>

        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          {modeSecours
            ? "Saisissez l'un des 5 codes à usage unique figurant sur votre fiche imprimée de secours."
            : "Ouvrez Google Authenticator sur votre téléphone et saisissez le code temporaire à 6 chiffres."}
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-5 font-medium">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="code_2fa" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {modeSecours ? "Code de secours (ex: 7K9P-4M2X)" : "Code à 6 chiffres (ex: 123 456)"}
            </label>
            <div className="relative">
              {modeSecours ? (
                <KeyRound className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              )}
              <input
                id="code_2fa"
                name="code_2fa"
                type="text"
                autoFocus
                required
                autoComplete="one-time-code"
                inputMode={modeSecours ? "text" : "numeric"}
                placeholder={modeSecours ? "XXXX-XXXX" : "123 456"}
                maxLength={modeSecours ? 9 : 7}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-lg text-2xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tracking-[0.2em] text-center font-bold transition shadow-inner bg-gray-50/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || (modeSecours ? code.trim().length < 8 : code.replace(/\s+/g, "").length !== 6)}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
          >
            {isPending ? "Vérification..." : "Valider et accéder à la console"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Options de secours et déconnexion */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setModeSecours(!modeSecours);
              setCode("");
              setError(null);
            }}
            className="text-xs text-primary hover:text-emerald-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:underline"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            {modeSecours
              ? "Revenir au code Google Authenticator"
              : "Téléphone inaccessible ? Utiliser un code de secours"}
          </button>

          <button
            type="button"
            onClick={handleAnnuler}
            disabled={isPending}
            className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Annuler et se déconnecter
          </button>
        </div>

        <div className="border-t border-gray-100 mt-6 pt-5 flex items-center justify-between text-sm">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour au site
          </Link>
          <a
            href={genererLienWhatsAppSupport("Bonjour Support GSR, j'ai besoin d'aide avec mon authentification 2FA.")}
            target="_blank"
            rel="noopener noreferrer"
            title={`Support Technique GSR (${CONTACTS_GSR.supportTechnique.telephone} - ${CONTACTS_GSR.supportTechnique.disponibilite})`}
            className="text-primary font-semibold hover:underline"
          >
            Besoin d&apos;aide ?
          </a>
        </div>
      </div>

      {/* Bandeau institutionnel identique à login */}
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
