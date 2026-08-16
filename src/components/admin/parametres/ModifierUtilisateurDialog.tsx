"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RoleSiteFields } from "@/components/admin/parametres/RoleSiteFields";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { modifierUtilisateur } from "@/actions/utilisateurs";
import { ROLE_LABELS, type UserRole } from "@/lib/constants";

interface SiteOption {
  id: number;
  nom_site: string;
}

interface ModifierUtilisateurDialogProps {
  userId: string;
  initialUsername: string;
  initialRole: UserRole;
  initialSiteId: number | null;
  initialSiteIds: number[];
  sites: SiteOption[];
  /** Ligne du coordonnateur connecté — changer son propre rôle le déconnecterait de cette page sans recours (aucun autre coordonnateur pour l'y remettre). */
  estSoiMeme?: boolean;
}

export function ModifierUtilisateurDialog({
  userId,
  initialUsername,
  initialRole,
  initialSiteId,
  initialSiteIds,
  sites,
  estSoiMeme = false,
}: ModifierUtilisateurDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [username, setUsername] = useState(initialUsername);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [siteId, setSiteId] = useState(initialSiteId ? String(initialSiteId) : "");
  const [siteIds, setSiteIds] = useState<number[]>(initialSiteIds);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((role === "chef_site" || role === "secretaire") && !siteId) return;
    if (role === "superviseur" && siteIds.length === 0) return;

    startTransition(async () => {
      const result = await modifierUtilisateur({
        id: userId,
        username,
        role,
        siteId: siteId ? Number(siteId) : null,
        siteIds,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Utilisateur modifié");
      setOpen(false);
      router.refresh();
    });
  }

  const peutSoumettre =
    username &&
    (role !== "chef_site" || siteId) &&
    (role !== "secretaire" || siteId) &&
    (role !== "superviseur" || siteIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-3.5 h-3.5" />
          <span className={HOVER_ONLY_LABEL}>Modifier</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            {estSoiMeme ? (
              <div>
                <Label>Rôle</Label>
                <p className="text-sm text-gray-500">
                  {ROLE_LABELS[role]} <span className="text-gray-400">— non modifiable sur votre propre compte</span>
                </p>
              </div>
            ) : (
              <RoleSiteFields
                role={role}
                onRoleChange={setRole}
                siteId={siteId}
                onSiteIdChange={setSiteId}
                siteIds={siteIds}
                onSiteIdsChange={setSiteIds}
                sites={sites}
              />
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !peutSoumettre}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
