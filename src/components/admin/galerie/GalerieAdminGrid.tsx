"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileImage } from "lucide-react";
import { toast } from "sonner";
import { supprimerPhotoGalerieAdmin } from "@/actions/galerie-admin";
import { ACTIONS_HOVER_REVEAL, cn } from "@/lib/utils";

export interface PhotoGalerieAdmin {
  id: number;
  storage_path: string;
  nom_fichier: string;
  date_ajout: string;
  ajoutePar: string;
  ajouteParId: string;
  url: string | null;
}

interface GalerieAdminGridProps {
  photos: PhotoGalerieAdmin[];
  /** chef_site/secretaire : true — bouton Supprimer masqué sur les photos d'un autre utilisateur. */
  suppressionLimiteeAuProprietaire: boolean;
  utilisateurId: string;
}

export function GalerieAdminGrid({ photos, suppressionLimiteeAuProprietaire, utilisateurId }: GalerieAdminGridProps) {
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
      {photos.map((photo) => {
        const peutSupprimer = !suppressionLimiteeAuProprietaire || photo.ajouteParId === utilisateurId;
        return (
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
            {peutSupprimer && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => supprimer(photo)}
                aria-label={`Supprimer ${photo.nom_fichier}`}
                className={cn(
                  "absolute top-2 right-2 w-9 h-9 rounded-lg bg-white/90 flex items-center justify-center text-red-500 shadow-sm hover:bg-red-50",
                  ACTIONS_HOVER_REVEAL
                )}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
