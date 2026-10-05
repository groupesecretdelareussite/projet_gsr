"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { JaugeMotDePasse } from "@/components/td/JaugeMotDePasse";
import { changerMonMotDePasseProf, deconnexionProfesseurTD } from "@/actions/auth-td";

export function MonCompteProfForm() {
  const router = useRouter();
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [afficherAncien, setAfficherAncien] = useState(false);
  const [afficherNouveau, setAfficherNouveau] = useState(false);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isPendingLogout, startLogoutTransition] = useTransition();

  const mdpCorrespondent = confirmation.length === 0 || nouveauMdp === confirmation;
  const peutSoumettre =
    ancienMdp.length > 0 &&
    nouveauMdp.length >= 8 &&
    nouveauMdp === confirmation &&
    !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!peutSoumettre) return;

    startTransition(async () => {
      const res = await changerMonMotDePasseProf(ancienMdp, nouveauMdp);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Votre mot de passe a été modifié avec succès");
      setAncienMdp("");
      setNouveauMdp("");
      setConfirmation("");
    });
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await deconnexionProfesseurTD();
      router.push("/td/login");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-lg shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Changer mon mot de passe</h2>
            <p className="text-xs text-gray-500">Choisissez un mot de passe robuste d&apos;au moins 8 caractères</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mot de passe actuel */}
          <div>
            <Label htmlFor="ancien_mdp" className="text-xs font-semibold text-gray-700">
              Mot de passe actuel <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="ancien_mdp"
                type={afficherAncien ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={ancienMdp}
                onChange={(e) => setAncienMdp(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setAfficherAncien(!afficherAncien)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={afficherAncien ? "Masquer le mot de passe actuel" : "Afficher le mot de passe actuel"}
              >
                {afficherAncien ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <Label htmlFor="nouveau_mdp" className="text-xs font-semibold text-gray-700">
              Nouveau mot de passe <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="nouveau_mdp"
                type={afficherNouveau ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="••••••••"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setAfficherNouveau(!afficherNouveau)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={afficherNouveau ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"}
              >
                {afficherNouveau ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Jauge et micro-checklist de robustesse */}
            <JaugeMotDePasse motDePasse={nouveauMdp} />
          </div>

          {/* Confirmation */}
          <div>
            <Label htmlFor="confirmation" className="text-xs font-semibold text-gray-700">
              Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="confirmation"
                type={afficherConfirmation ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setAfficherConfirmation(!afficherConfirmation)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={afficherConfirmation ? "Masquer la confirmation" : "Afficher la confirmation"}
              >
                {afficherConfirmation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!mdpCorrespondent && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!peutSoumettre}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isPending ? "Modification en cours..." : "Modifier mon mot de passe"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Zone déconnexion */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-lg shadow-xs flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Session active</h3>
          <p className="text-xs text-gray-500">Se déconnecter en toute sécurité de cet appareil</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          disabled={isPendingLogout}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          <span>{isPendingLogout ? "Déconnexion..." : "Se déconnecter"}</span>
        </Button>
      </div>
    </div>
  );
}
