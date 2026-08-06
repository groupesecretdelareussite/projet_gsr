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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { HOVER_ONLY_LABEL } from "@/lib/utils";
import { modifierProfesseurTD } from "@/actions/td-config";

interface Option {
  id: number;
  nom: string;
}

interface ModifierProfesseurDialogProps {
  professeurId: number;
  initialNom: string;
  initialPrenom: string;
  initialTelephone: string;
  initialEmail: string;
  initialZoneId: number;
  initialMatiereId: number;
  zones: Option[];
  matieres: Option[];
}

export function ModifierProfesseurDialog({
  professeurId,
  initialNom,
  initialPrenom,
  initialTelephone,
  initialEmail,
  initialZoneId,
  initialMatiereId,
  zones,
  matieres,
}: ModifierProfesseurDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [nom, setNom] = useState(initialNom);
  const [prenom, setPrenom] = useState(initialPrenom);
  const [telephone, setTelephone] = useState(initialTelephone);
  const [email, setEmail] = useState(initialEmail);
  const [zoneId, setZoneId] = useState(String(initialZoneId));
  const [matiereId, setMatiereId] = useState(String(initialMatiereId));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await modifierProfesseurTD({
        id: professeurId,
        nom,
        prenom,
        telephone,
        email,
        zoneId: Number(zoneId),
        matierePrincipaleId: Number(matiereId),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Professeur modifié");
      setOpen(false);
      router.refresh();
    });
  }

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
          <DialogTitle>Modifier le professeur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" required value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" required value={telephone} onChange={(e) => setTelephone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Zone</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Matière principale</Label>
                <Select value={matiereId} onValueChange={setMatiereId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {matieres.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
