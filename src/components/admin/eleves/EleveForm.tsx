"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { inscrireEleve, modifierEleve } from "@/actions/eleves";
import { OPTIONS_M } from "@/lib/constants";

interface SiteOption {
  id: number;
  nom_site: string;
}

interface ClasseOption {
  id: number;
  nom_classe: string;
}

interface EleveFormProps {
  sites: SiteOption[];
  mode: "create" | "edit";
  eleveId?: number;
  initialValues?: {
    nom: string;
    prenoms: string;
    contactParent: string;
    siteId: number;
    classeId: number;
    college: string;
    optionM: string | null;
  };
  matricule?: string;
}

export function EleveForm({ sites, mode, eleveId, initialValues, matricule }: EleveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState(initialValues?.siteId ? String(initialValues.siteId) : "");
  const [classeId, setClasseId] = useState(initialValues?.classeId ? String(initialValues.classeId) : "");
  const [classes, setClasses] = useState<ClasseOption[]>([]);
  const [nom, setNom] = useState(initialValues?.nom ?? "");
  const [prenoms, setPrenoms] = useState(initialValues?.prenoms ?? "");
  const [contactParent, setContactParent] = useState(initialValues?.contactParent ?? "");
  const [college, setCollege] = useState(initialValues?.college ?? "");
  const [optionM, setOptionM] = useState(initialValues?.optionM ?? "");
  const [confirmationRequise, setConfirmationRequise] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) {
      setClasses([]);
      return;
    }
    fetch(`/api/classes-by-site?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []));
  }, [siteId]);

  function submit(force = false) {
    startTransition(async () => {
      if (mode === "create") {
        const result = await inscrireEleve(
          {
            nom,
            prenoms,
            contactParent,
            classeId: Number(classeId),
            college,
            optionM: optionM || null,
          },
          { force }
        );

        if (result.requiresConfirmation) {
          setConfirmationRequise(result.error ?? "Doublon possible détecté.");
          return;
        }
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`Élève inscrit — matricule ${result.matricule}`);
        router.push("/admin/eleves/liste");
      } else {
        const result = await modifierEleve({
          id: eleveId!,
          nom,
          prenoms,
          contactParent,
          classeId: Number(classeId),
          college,
          optionM: optionM || null,
        });

        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Élève modifié");
        router.push("/admin/eleves/liste");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfirmationRequise(null);
    submit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 max-w-2xl">
      {matricule && (
        <div>
          <Label>Matricule</Label>
          <Input value={matricule} disabled />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" required value={nom} onChange={(e) => setNom(e.target.value.toUpperCase())} />
        </div>
        <div>
          <Label htmlFor="prenoms">Prénoms</Label>
          <Input id="prenoms" required value={prenoms} onChange={(e) => setPrenoms(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Contact parent</Label>
        <PhoneInput value={contactParent} onChange={setContactParent} required />
      </div>

      <div>
        <Label htmlFor="college">Collège</Label>
        <Input id="college" required value={college} onChange={(e) => setCollege(e.target.value.toUpperCase())} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Site</Label>
          <Select
            value={siteId}
            onValueChange={(v) => {
              setSiteId(v);
              setClasseId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nom_site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Classe</Label>
          <Select value={classeId} onValueChange={setClasseId}>
            <SelectTrigger disabled={!siteId}>
              <SelectValue placeholder={siteId ? "Choisir une classe" : "Choisir un site d'abord"} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nom_classe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="sm:w-1/2">
        <Label>Option (facultatif)</Label>
        <Select value={optionM} onValueChange={setOptionM}>
          <SelectTrigger>
            <SelectValue placeholder="Aucune" />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS_M.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {confirmationRequise && (
        <div className="bg-orange-50 border border-orange-100 text-orange-700 text-sm rounded-lg px-4 py-3 space-y-2">
          <p>{confirmationRequise}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => submit(true)} disabled={isPending}>
            Confirmer l&apos;inscription malgré tout
          </Button>
        </div>
      )}

      <Button type="submit" disabled={isPending || !classeId}>
        {isPending ? "Enregistrement..." : mode === "create" ? "Inscrire l'élève" : "Enregistrer les modifications"}
      </Button>
    </form>
  );
}
