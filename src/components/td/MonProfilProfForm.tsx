"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Save, Mail, Phone, MapPin, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { modifierMonProfilProf } from "@/actions/auth-td";

interface Option {
  id: number;
  nom: string;
}

interface MonProfilProfFormProps {
  initialNom: string;
  initialPrenom: string;
  initialTelephone: string;
  initialEmail: string;
  initialZoneId: number;
  initialMatiereId: number;
  zones: Option[];
  matieres: Option[];
}

export function MonProfilProfForm({
  initialNom,
  initialPrenom,
  initialTelephone,
  initialEmail,
  initialZoneId,
  initialMatiereId,
  zones,
  matieres,
}: MonProfilProfFormProps) {
  const router = useRouter();
  const [nom, setNom] = useState(initialNom);
  const [prenom, setPrenom] = useState(initialPrenom);
  const [telephone, setTelephone] = useState(initialTelephone);
  const [email, setEmail] = useState(initialEmail);
  const [zoneId, setZoneId] = useState(String(initialZoneId));
  const [matiereId, setMatiereId] = useState(String(initialMatiereId));

  const [isPending, startTransition] = useTransition();

  const aModifie =
    nom !== initialNom ||
    prenom !== initialPrenom ||
    telephone !== initialTelephone ||
    email !== initialEmail ||
    zoneId !== String(initialZoneId) ||
    matiereId !== String(initialMatiereId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aModifie || isPending) return;

    startTransition(async () => {
      const res = await modifierMonProfilProf({
        nom,
        prenom,
        telephone,
        email,
        zoneId: Number(zoneId),
        matierePrincipaleId: Number(matiereId),
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Vos informations ont été mises à jour avec succès");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs max-w-lg">
      <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
          {prenom?.charAt(0)?.toUpperCase()}
          {nom?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 leading-tight">
            {prenom} {nom}
          </h2>
          <div className="flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Informations personnelles modifiables</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nom & Prénom */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="prof_nom" className="text-xs font-semibold text-gray-700">
              Nom <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prof_nom"
              required
              minLength={2}
              maxLength={100}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <Label htmlFor="prof_prenom" className="text-xs font-semibold text-gray-700">
              Prénom <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prof_prenom"
              required
              minLength={2}
              maxLength={100}
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="mt-1"
              placeholder="Votre prénom"
            />
          </div>
        </div>

        {/* Email & Téléphone */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="prof_email" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              Email de connexion <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prof_email"
              type="email"
              required
              maxLength={150}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder="nom@exemple.com"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              Téléphone <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1">
              <PhoneInput value={telephone} onChange={setTelephone} required />
            </div>
          </div>
        </div>

        {/* Zone & Matière principale */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              Zone géographique <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1">
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une zone..." />
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
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-gray-400" />
              Matière principale <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1">
              <Select value={matiereId} onValueChange={setMatiereId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une matière..." />
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
        </div>

        <div className="pt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">
            {aModifie ? "Modifications non enregistrées" : "Informations à jour"}
          </p>
          <Button
            type="submit"
            disabled={!aModifie || isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? "Enregistrement..." : "Enregistrer les modifications"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
