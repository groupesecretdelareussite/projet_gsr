"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploaderPhotoGalerieAdmin } from "@/actions/galerie-admin";

export function UploaderPhotoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await uploaderPhotoGalerieAdmin(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Photo ajoutée");
      formRef.current?.reset();
      setNomFichier(null);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <label className="flex-1 w-full">
        <input
          type="file"
          name="fichier"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={(e) => setNomFichier(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary-dark hover:file:bg-primary/20"
        />
      </label>
      <Button type="submit" disabled={isPending || !nomFichier}>
        <Upload className="w-4 h-4" />
        {isPending ? "Envoi..." : "Ajouter"}
      </Button>
    </form>
  );
}
