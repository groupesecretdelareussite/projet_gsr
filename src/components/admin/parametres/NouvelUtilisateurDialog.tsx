"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoleSiteFields } from "@/components/admin/parametres/RoleSiteFields";
import { creerUtilisateur } from "@/actions/utilisateurs";
import type { UserRole } from "@/lib/constants";

interface SiteOption {
  id: number;
  nom_site: string;
}

export function NouvelUtilisateurDialog({ sites }: { sites: SiteOption[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("comptable");
  const [siteId, setSiteId] = useState("");
  const [siteIds, setSiteIds] = useState<number[]>([]);

  function reset() {
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("comptable");
    setSiteId("");
    setSiteIds([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((role === "chef_site" || role === "secretaire") && !siteId) return;
    if (role === "superviseur" && siteIds.length === 0) return;

    startTransition(async () => {
      const result = await creerUtilisateur({
        username,
        email,
        password,
        role,
        siteId: siteId ? Number(siteId) : null,
        siteIds,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Utilisateur créé");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const peutSoumettre =
    username &&
    email &&
    password.length >= 8 &&
    (role !== "chef_site" || siteId) &&
    (role !== "secretaire" || siteId) &&
    (role !== "superviseur" || siteIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-3.5 h-3.5" />
          Nouvel utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>Le mot de passe saisi est le mot de passe initial du compte.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Mot de passe initial</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <RoleSiteFields
              role={role}
              onRoleChange={setRole}
              siteId={siteId}
              onSiteIdChange={setSiteId}
              siteIds={siteIds}
              onSiteIdsChange={setSiteIds}
              sites={sites}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !peutSoumettre}>
              {isPending ? "Création..." : "Créer l'utilisateur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
