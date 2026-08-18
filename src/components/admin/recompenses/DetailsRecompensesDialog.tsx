"use client";

import { useState } from "react";
import { Eye, Award, CheckCircle2, Clock } from "lucide-react";
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

export interface NoteDetail {
  noteId: number;
  matiereNom: string;
  codeMatiere: string;
  typeNote: string;
  valeur: number;
  typeGain: "interro" | "devoir";
  montant: number;
  estPayee: boolean;
  datePaiement?: string | null;
}

export function DetailsRecompensesDialog({
  eleveNom,
  elevePrenoms,
  nomClasse,
  mois,
  notes,
}: {
  eleveNom: string;
  elevePrenoms: string;
  nomClasse: string;
  mois: string;
  notes: NoteDetail[];
}) {
  const [open, setOpen] = useState(false);

  const totalGains = notes.reduce((s, n) => s + n.montant, 0);
  const totalPaye = notes.filter((n) => n.estPayee).reduce((s, n) => s + n.montant, 0);
  const totalRestant = totalGains - totalPaye;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Eye className="w-3.5 h-3.5" />
          <span>Détails</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                {eleveNom} {elevePrenoms}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {nomClasse} · Récompenses de {mois}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Résumé des montants */}
          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Total dû</p>
              <p className="text-sm font-bold text-gray-900">{totalGains.toLocaleString("fr-FR")} F</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Déjà versé</p>
              <p className="text-sm font-bold text-emerald-600">{totalPaye.toLocaleString("fr-FR")} F</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reste à payer</p>
              <p className={`text-sm font-bold ${totalRestant > 0 ? "text-amber-600" : "text-gray-400"}`}>
                {totalRestant.toLocaleString("fr-FR")} F
              </p>
            </div>
          </div>

          {/* Liste détaillée des notes méritantes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Notes méritantes ({notes.length})</p>
            {notes.map((n) => (
              <div
                key={n.noteId}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{n.matiereNom}</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{n.typeNote}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Note obtenue : <span className="font-bold text-gray-800">{n.valeur}/20</span> ·{" "}
                    {n.typeGain === "interro" ? "Interro scientifique (200F)" : "Devoir ≥ 18/20 (500F)"}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <span className="font-bold text-sm text-gray-900">+{n.montant} F</span>
                  {n.estPayee ? (
                    <Badge variant="success" className="gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Payé
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      À payer
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
