"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { JaugeMotDePasse } from "@/components/td/JaugeMotDePasse";
import { inscrireProfesseurTD } from "@/actions/td-config";

interface Option {
  id: number;
  nom: string;
}

interface InscriptionProfesseurFormProps {
  zones: Option[];
  matieres: Option[];
}

export function InscriptionProfesseurForm({ zones, matieres }: InscriptionProfesseurFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (motDePasse !== confirmationMotDePasse) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (motDePasse.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères");
      return;
    }

    startTransition(async () => {
      const result = await inscrireProfesseurTD({
        nom,
        prenom,
        telephone,
        email,
        motDePasse,
        zoneId: Number(zoneId),
        matierePrincipaleId: Number(matiereId),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Demande enregistrée !</h2>
          <p className="text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
            Votre profil d&apos;enseignant a bien été créé. Votre compte est actuellement en attente de vérification et de validation par le coordonnateur.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 text-left max-w-sm mx-auto space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Que se passe-t-il ensuite ?
          </p>
          <p className="leading-relaxed text-amber-800/90">
            Dès que la coordination aura vérifié vos informations et activé votre accès, vous pourrez vous connecter immédiatement avec votre email et le mot de passe que vous venez de définir.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/td/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all"
            style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la page de connexion
          </Link>
        </div>
      </div>
    );
  }

  const peutSoumettre =
    nom.trim() &&
    prenom.trim() &&
    telephone.trim() &&
    email.trim() &&
    zoneId &&
    matiereId &&
    motDePasse.length >= 8 &&
    motDePasse === confirmationMotDePasse;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Nom & Prénom */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nom" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="nom"
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex. KOUASSI"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
        <div>
          <label htmlFor="prenom" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            id="prenom"
            type="text"
            required
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Ex. Jean-Luc"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
      </div>

      {/* Téléphone & Email */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <PhoneInput value={telephone} onChange={setTelephone} required />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Adresse email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prof@exemple.com"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
      </div>

      {/* Matière & Zone */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="matiere" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Matière principale <span className="text-red-500">*</span>
          </label>
          <select
            id="matiere"
            required
            value={matiereId}
            onChange={(e) => setMatiereId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          >
            <option value="">Sélectionner une matière...</option>
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="zone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Zone de résidence / préférence <span className="text-red-500">*</span>
          </label>
          <select
            id="zone"
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          >
            <option value="">Sélectionner une zone...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mot de passe & Jauge */}
      <div>
        <label htmlFor="motDePasse" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Mot de passe <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="motDePasse"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Au moins 8 caractères"
            className="w-full pl-3.5 pr-11 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Jauge dynamique */}
        <JaugeMotDePasse motDePasse={motDePasse} />
      </div>

      {/* Confirmation mot de passe */}
      <div>
        <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Confirmer le mot de passe <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            required
            minLength={8}
            value={confirmationMotDePasse}
            onChange={(e) => setConfirmationMotDePasse(e.target.value)}
            placeholder="Retapez votre mot de passe"
            className="w-full pl-3.5 pr-11 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2"
            aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmationMotDePasse && motDePasse !== confirmationMotDePasse && (
          <p className="text-[11px] text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
        )}
      </div>

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={isPending || !peutSoumettre}
        className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none mt-6"
        style={{ background: "linear-gradient(135deg, #12AA00, #0e8f00)" }}
      >
        {isPending ? "Envoi de la demande..." : "Créer mon compte professeur"}
        <ArrowRight className="w-4 h-4" />
      </button>

      <div className="text-center pt-2">
        <Link href="/td/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Déjà un compte ? Se connecter
        </Link>
      </div>
    </form>
  );
}
