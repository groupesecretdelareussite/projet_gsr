"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { creerActualite, modifierActualite, supprimerImageActualite } from "@/actions/actualites";
import { CATEGORIES, type Categorie } from "@/lib/actualites";

const CHAMP_TEXTE = "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition";
const CHAMP_FICHIER = "block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary-dark hover:file:bg-primary/20";

function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

interface ImageExistante {
  id: number;
  url: string;
}

export interface ActualiteExistante {
  id: number;
  titre: string;
  categorie: Categorie;
  extrait: string;
  contenu: string;
  statut: "brouillon" | "publie";
  aLaUneJusquAu: string | null;
  images: ImageExistante[];
}

/** Créer/modifier un article — le même formulaire sert aux deux, `article` absent = mode création. */
export function ActualiteForm({ article }: { article?: ActualiteExistante }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categorie, setCategorie] = useState<Categorie>(article?.categorie ?? CATEGORIES[0]);
  const [statut, setStatut] = useState<"brouillon" | "publie">(article?.statut ?? "brouillon");
  const [aLaUne, setALaUne] = useState(!!article?.aLaUneJusquAu);
  const [aLaUneJusquAu, setALaUneJusquAu] = useState(article?.aLaUneJusquAu ?? dansNJours(14));
  const [imagesExistantes, setImagesExistantes] = useState(article?.images ?? []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = article ? await modifierActualite(article.id, formData) : await creerActualite(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(article ? "Article modifié" : "Article créé");
      router.push("/admin/actualites");
      router.refresh();
    });
  }

  function handleSupprimerImage(imageId: number) {
    if (!window.confirm("Supprimer cette image ?")) return;
    startTransition(async () => {
      const result = await supprimerImageActualite(imageId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setImagesExistantes((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image supprimée");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <Label htmlFor="titre">Titre</Label>
        <Input id="titre" name="titre" required defaultValue={article?.titre} />
      </div>

      <div>
        <Label htmlFor="categorie">Catégorie</Label>
        <input type="hidden" name="categorie" value={categorie} />
        <Select value={categorie} onValueChange={(v) => setCategorie(v as Categorie)}>
          <SelectTrigger id="categorie">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="extrait">Extrait (résumé court affiché sur la carte)</Label>
        <textarea id="extrait" name="extrait" required rows={2} defaultValue={article?.extrait} className={CHAMP_TEXTE} />
      </div>

      <div>
        <Label htmlFor="contenu">Contenu complet — un paragraphe par ligne vide</Label>
        <textarea id="contenu" name="contenu" required rows={10} defaultValue={article?.contenu} className={CHAMP_TEXTE} />
      </div>

      {article && imagesExistantes.length > 0 && (
        <div>
          <Label>Images actuelles ({imagesExistantes.length}) — la première est la couverture</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {imagesExistantes.map((img, i) => (
              <div key={img.id} className="relative group">
                <div className="relative h-24 rounded-lg overflow-hidden border border-gray-200">
                  <Image src={img.url} alt="" fill className="object-cover" />
                </div>
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    Couverture
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSupprimerImage(img.id)}
                  disabled={isPending}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="images">{article ? "Ajouter des images" : "Images — la première sera la couverture"}</Label>
        <input
          type="file"
          id="images"
          name="images"
          accept="image/png,image/jpeg,image/webp"
          multiple
          required={!article && imagesExistantes.length === 0}
          className={CHAMP_FICHIER}
        />
      </div>

      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          id="aLaUne"
          name="aLaUne"
          checked={aLaUne}
          onChange={(e) => setALaUne(e.target.checked)}
          className="w-4 h-4 accent-primary"
        />
        <label htmlFor="aLaUne" className="text-sm font-medium text-gray-700">
          Mettre à la une
        </label>
      </div>

      {aLaUne && (
        <div>
          <Label htmlFor="aLaUneJusquAu">À la une jusqu&apos;au (14 jours par défaut)</Label>
          <input
            type="date"
            id="aLaUneJusquAu"
            name="aLaUneJusquAu"
            value={aLaUneJusquAu}
            onChange={(e) => setALaUneJusquAu(e.target.value)}
            className={CHAMP_TEXTE}
          />
        </div>
      )}

      <div>
        <Label>Statut</Label>
        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="statut"
              value="brouillon"
              checked={statut === "brouillon"}
              onChange={() => setStatut("brouillon")}
              className="accent-primary"
            />
            Brouillon
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="statut"
              value="publie"
              checked={statut === "publie"}
              onChange={() => setStatut("publie")}
              className="accent-primary"
            />
            Publié
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          <Save className="w-4 h-4" />
          {article ? "Enregistrer" : "Créer l'article"}
        </Button>
      </div>
    </form>
  );
}
