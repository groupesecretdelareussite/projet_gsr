"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileImage } from "lucide-react";
import { toast } from "sonner";
import { supprimerPhotoGalerieAdmin } from "@/actions/galerie-admin";

export interface PhotoGalerieAdmin {
  id: number;
  storage_path: string;
  nom_fichier: string;
  date_ajout: string;
  ajoutePar: string;
  url: string | null;
}

export function GalerieAdminGrid({ photos }: { photos: PhotoGalerieAdmin[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function supprimer(photo: PhotoGalerieAdmin) {
    if (!window.confirm(`Supprimer "${photo.nom_fichier}" définitivement ?`)) return;

    startTransition(async () => {
      const result = await supprimerPhotoGalerieAdmin(photo.id, photo.storage_path);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Photo supprimée");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group relative">
          <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
            {photo.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, next/image exigerait un remotePattern instable
              <img src={photo.url} alt={photo.nom_fichier} className="w-full h-full object-cover" />
            ) : (
              <FileImage className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs text-gray-600 truncate">{photo.nom_fichier}</p>
            <p className="text-xs text-gray-400">
              {new Date(photo.date_ajout).toLocaleDateString("fr-FR")} — {photo.ajoutePar}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => supprimer(photo)}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
