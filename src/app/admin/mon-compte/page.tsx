"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { changerMonMotDePasse, logout } from "@/actions/auth";

import { GestionMfaCard } from "@/components/admin/mon-compte/GestionMfaCard";

/** Accessible à tous les rôles connectés — self-service, contrairement à Paramètres > Utilisateurs (coordonnateur only). */
export default function MonComptePage() {
  const router = useRouter();
  const [ancienMdp, setAncienMdp] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isPendingLogout, startLogoutTransition] = useTransition();

  const peutSoumettre = ancienMdp.length > 0 && nouveauMdp.length >= 8 && nouveauMdp === confirmation;

  function handleLogout() {
    startLogoutTransition(async () => {
      await logout();
      router.push("/admin/login");
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!peutSoumettre) return;

    startTransition(async () => {
      const result = await changerMonMotDePasse(ancienMdp, nouveauMdp);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Mot de passe modifié");
      setAncienMdp("");
      setNouveauMdp("");
      setConfirmation("");
    });
  }

  return (
    <div>
      <PageHeader title="Mon compte" subtitle="Gestion de vos identifiants et sécurité" />

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-gray-900 text-base">Mot de passe</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="ancien_mdp">Mot de passe actuel</Label>
              <Input
                id="ancien_mdp"
                type="password"
                required
                autoComplete="current-password"
                value={ancienMdp}
                onChange={(e) => setAncienMdp(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nouveau_mdp">Nouveau mot de passe</Label>
              <Input
                id="nouveau_mdp"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmation"
                type="password"
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
              {confirmation.length > 0 && nouveauMdp !== confirmation && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            <Button type="submit" disabled={!peutSoumettre || isPending}>
              <KeyRound className="w-4 h-4" />
              {isPending ? "Modification..." : "Modifier mon mot de passe"}
            </Button>
          </form>
        </div>

        <GestionMfaCard />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-4xl mt-6">
        <Button type="button" variant="outline" onClick={handleLogout} disabled={isPendingLogout}>
          <LogOut className="w-4 h-4" />
          {isPendingLogout ? "Déconnexion..." : "Se déconnecter"}
        </Button>
      </div>
    </div>
  );
}
