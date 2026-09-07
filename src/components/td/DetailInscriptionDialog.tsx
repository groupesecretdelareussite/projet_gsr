"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Check, X, Mail, Phone, MapPin, BookOpen, Calendar, AlertTriangle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { validerProfesseurTD, refuserProfesseurTD } from "@/actions/td-config";

export interface DemandeInscription {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  zoneId: number;
  nomZone: string;
  matiereId: number;
  nomMatiere: string;
  dateInscription: string;
}

export function DetailInscriptionDialog({ demande }: { demande: DemandeInscription }) {
  const [open, setOpen] = useState(false);
  const [confirmRefusOpen, setConfirmRefusOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const dateFormatee = new Date(demande.dateInscription).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleValider() {
    startTransition(async () => {
      const result = await validerProfesseurTD(demande.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Le compte de ${demande.prenom} ${demande.nom} a été validé avec succès.`);
      setOpen(false);
      router.refresh();
    });
  }

  function handleRefuser() {
    startTransition(async () => {
      const result = await refuserProfesseurTD(demande.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`La demande de ${demande.prenom} ${demande.nom} a été refusée.`);
      setConfirmRefusOpen(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            Consulter
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-lg">Détails de la demande</DialogTitle>
              <Badge variant="warning">En attente</Badge>
            </div>
            <DialogDescription>
              Demande enregistrée le {dateFormatee}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 py-2">
            {/* Nom & Prénom */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                Professeur candidat
              </span>
              <p className="text-lg font-bold text-gray-900">
                {demande.prenom} {demande.nom}
              </p>
            </div>

            {/* Coordonnées */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-gray-400 font-medium block">Adresse email</span>
                  <a
                    href={`mailto:${demande.email}`}
                    className="text-sm font-medium text-gray-800 hover:text-primary transition-colors truncate block"
                  >
                    {demande.email}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-gray-400 font-medium block">Téléphone</span>
                  <a
                    href={`tel:${demande.telephone}`}
                    className="text-sm font-medium text-gray-800 hover:text-primary transition-colors block"
                  >
                    {demande.telephone}
                  </a>
                </div>
              </div>
            </div>

            {/* Informations Pédagogiques & Affectation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Matière principale
                </div>
                <p className="text-sm font-semibold text-gray-900">{demande.nomMatiere}</p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-white">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Zone souhaitée
                </div>
                <p className="text-sm font-semibold text-gray-900">{demande.nomZone}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 pt-1">
              En validant ce compte, vous autorisez cet enseignant à se connecter au portail TD et à postuler sur les créneaux disponibles.
            </p>
          </DialogBody>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirmRefusOpen(true)}
              className="gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Refuser
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleValider}
              className="gap-1.5 bg-primary text-white hover:bg-primary-dark"
            >
              <Check className="w-3.5 h-3.5" />
              {isPending ? "Validation..." : "Valider le compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation de refus */}
      <Dialog open={confirmRefusOpen} onOpenChange={setConfirmRefusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>Refuser la demande ?</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir refuser la candidature de {demande.prenom} {demande.nom} ? Cette action supprimera définitivement cette demande.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmRefusOpen(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRefuser} disabled={isPending}>
              {isPending ? "Refus..." : "Confirmer le refus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
