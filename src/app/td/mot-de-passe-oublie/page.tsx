"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { demanderReinitialisationProfesseurTD } from "@/actions/auth-td";

export default function MotDePasseOublieProfPage() {
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");

    startTransition(async () => {
      const res = await demanderReinitialisationProfesseurTD(email);
      if (res.error) {
        setErreur(res.error);
        return;
      }
      setEnvoye(true);
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

        {envoye ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email envoyé</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Si un compte professeur actif existe avec cette adresse, un lien de réinitialisation sécurisé vient de lui être envoyé.
            </p>
            <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xs leading-relaxed text-left border border-emerald-100 mb-2">
              💡 <strong>Conseil :</strong> Vérifiez votre boîte de réception et vos courriers indésirables (spams). Le lien expirera dans <strong>15 minutes</strong>.
            </div>
          </div>
        ) : (
          <>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Espace Professeurs</p>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Mot de passe oublié</h1>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Saisissez l&apos;adresse email associée à votre compte professeur, nous vous enverrons un lien pour choisir un nouveau mot de passe.
            </p>

            {erreur && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                {erreur}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="prof@exemple.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:pointer-events-none"
                style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
              >
                {isPending ? "Envoi en cours..." : "Envoyer le lien"}
              </button>
            </form>
          </>
        )}

        <div className="border-t border-gray-100 mt-8 pt-6">
          <Link href="/td/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
