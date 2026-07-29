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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { creerProfesseurTD } from "@/actions/td-config";

interface Option {
  id: number;
  nom: string;
}

export function NouveauProfesseurDialog({ zones, matieres }: { zones: Option[]; matieres: Option[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [matiereId, setMatiereId] = useState("");

  function reset() {
    setNom("");
    setPrenom("");
    setTelephone("");
    setEmail("");
    setMotDePasse("");
    setZoneId("");
    setMatiereId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await creerProfesseurTD({
        nom,
        prenom,
        telephone,
        email,
        motDePasse,
        zoneId: Number(zoneId),
        matierePrincipaleId: Number(matiereId),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Professeur créé");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const peutSoumettre = nom && prenom && telephone && email && motDePasse.length >= 8 && zoneId && matiereId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="w-3.5 h-3.5" />
          Nouveau professeur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau professeur</DialogTitle>
          <DialogDescription>Le mot de passe saisi est le mot de passe initial du compte.</DialogDescription>
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
            <div>
              <Label htmlFor="motDePasse">Mot de passe initial</Label>
              <Input
                id="motDePasse"
                type="password"
                required
                minLength={8}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Zone</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
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
                    <SelectValue placeholder="Choisir..." />
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
            <Button type="submit" disabled={isPending || !peutSoumettre}>
              {isPending ? "Création..." : "Créer le professeur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
