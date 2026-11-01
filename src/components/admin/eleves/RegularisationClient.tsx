"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  regulariserSuspension,
  type EleveSuspenduDefautPaiement,
} from "@/actions/regulariser-suspension";
import { MODES_PAIEMENT, MODE_PAIEMENT_LABELS, type ModePaiement } from "@/lib/constants";
import { formaterDateCourt } from "@/lib/date-utils";

function getHierIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

interface RegularisationClientProps {
  elevesInitiaux: EleveSuspenduDefautPaiement[];
}

export function RegularisationClient({ elevesInitiaux }: RegularisationClientProps) {
  const router = useRouter();
  const [eleves, setEleves] = useState<EleveSuspenduDefautPaiement[]>(elevesInitiaux);
  const [recherche, setRecherche] = useState("");
  const [eleveSelectionne, setEleveSelectionne] = useState<EleveSuspenduDefautPaiement | null>(null);

  // Formulaire modal
  const [montantSaisi, setMontantSaisi] = useState<string>("");
  const [datePaiement, setDatePaiement] = useState<string>(getHierIso());
  const [modePaiement, setModePaiement] = useState<ModePaiement>("MoMo");
  const [isPending, startTransition] = useTransition();

  // Filtrage
  const elevesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return eleves;
    return eleves.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenoms.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q) ||
        e.nomClasse.toLowerCase().includes(q) ||
        e.nomSite.toLowerCase().includes(q)
    );
  }, [eleves, recherche]);

  function ouvrirModal(e: EleveSuspenduDefautPaiement) {
    setEleveSelectionne(e);
    const resteAvant = Math.max(0, e.montantAttendu - e.dejaPaye);
    setMontantSaisi(String(resteAvant));
    setDatePaiement(getHierIso());
    setModePaiement("MoMo");
  }

  function fermerModal() {
    setEleveSelectionne(null);
    setMontantSaisi("");
  }

  const montantNum = Number(montantSaisi) || 0;
  const fraisAttendu = eleveSelectionne ? eleveSelectionne.montantAttendu : 0;
  const dejaPaye = eleveSelectionne ? eleveSelectionne.dejaPaye : 0;
  const resteAvant = Math.max(0, fraisAttendu - dejaPaye);
  const totalPayeTheorique = dejaPaye + montantNum;

  const estDepassement = montantNum > resteAvant;
  const estSoldeComplet = montantNum > 0 && totalPayeTheorique === fraisAttendu;
  const estAcomptePartiel = montantNum > 0 && totalPayeTheorique < fraisAttendu;
  const nouveauResteTheorique = Math.max(0, resteAvant - montantNum);

  function handleValider(e: React.FormEvent) {
    e.preventDefault();
    if (!eleveSelectionne) return;

    if (montantNum <= 0) {
      toast.error("Veuillez saisir un montant versé.");
      return;
    }

    if (estDepassement) {
      toast.error(`Le montant dépasse le reste dû (${resteAvant.toLocaleString("fr-FR")} F).`);
      return;
    }

    startTransition(async () => {
      const res = await regulariserSuspension({
        eleveId: eleveSelectionne.id,
        montantVerse: montantNum,
        datePaiement,
        modePaiement,
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(res.message);

      if (res.categorie === "solde_complet") {
        setEleves((prev) => prev.filter((el) => el.id !== eleveSelectionne.id));
      } else if (res.categorie === "acompte_partiel") {
        setEleves((prev) =>
          prev.map((el) => {
            if (el.id === eleveSelectionne.id) {
              const nouveauDeja = el.dejaPaye + montantNum;
              return {
                ...el,
                dejaPaye: nouveauDeja,
                montantDuActuel: res.nouveauResteDu ?? Math.max(0, el.montantAttendu - nouveauDeja),
              };
            }
            return el;
          })
        );
      }

      fermerModal();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Entête */}
      <div>
        <Link
          href="/admin/eleves/suspendus"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour aux élèves suspendus</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Régularisation des suspensions</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Enregistrement des versements reçus avant le 1er du mois pour les élèves suspendus.
            </p>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md self-start sm:self-auto">
            {elevesFiltres.length} dossier(s) en cours
          </span>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, matricule, classe ou site..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Liste des dossiers */}
      {elevesFiltres.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-lg border border-gray-200">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">Aucun dossier à régulariser</h3>
          <p className="text-xs text-gray-500 mt-1">
            {recherche.trim()
              ? "Aucun élève suspendu ne correspond à cette recherche."
              : "Tous les paiements ont été traités."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5">Matricule</th>
                  <th className="px-3 py-2.5">Élève</th>
                  <th className="px-3 py-2.5">Classe & Site</th>
                  <th className="px-3 py-2.5">Mois</th>
                  <th className="px-3 py-2.5">Frais mensuels</th>
                  <th className="px-3 py-2.5">Déjà payé</th>
                  <th className="px-3 py-2.5">Reste dû</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {elevesFiltres.map((el) => {
                  const reste = Math.max(0, el.montantAttendu - el.dejaPaye);
                  return (
                    <tr key={el.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-gray-700">{el.matricule}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {el.nom} {el.prenoms}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        <span>{el.nomClasse}</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{el.nomSite}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="warning">{el.moisSouscription}</Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-700">
                        {el.montantAttendu.toLocaleString("fr-FR")} F
                      </td>
                      <td className="px-3 py-2.5 font-mono text-emerald-600">
                        {el.dejaPaye > 0 ? `${el.dejaPaye.toLocaleString("fr-FR")} F` : "0 F"}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-red-600">
                        {reste.toLocaleString("fr-FR")} F
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => ouvrirModal(el)}
                          className="bg-primary hover:bg-primary/90 text-white gap-1"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Régulariser</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de régularisation */}
      <Dialog open={!!eleveSelectionne} onOpenChange={(open) => !open && fermerModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-base">
              <Receipt className="w-4 h-4 text-white/80" />
              <span>Régulariser un paiement</span>
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs">
              Enregistrement du versement pour l&apos;élève sélectionné.
            </DialogDescription>
          </DialogHeader>

          {eleveSelectionne && (
            <form onSubmit={handleValider}>
              <DialogBody className="space-y-4">
                {/* Récapitulatif élève */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">
                      {eleveSelectionne.nom} {eleveSelectionne.prenoms}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                      {eleveSelectionne.matricule} — {eleveSelectionne.nomClasse} ({eleveSelectionne.nomSite})
                    </div>
                  </div>
                  <Badge variant="warning">{eleveSelectionne.moisSouscription}</Badge>
                </div>

                {/* Synthèse montants */}
                <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-lg border border-gray-100 bg-white">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-medium">Attendu</div>
                    <div className="text-xs font-semibold text-gray-800">
                      {fraisAttendu.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-medium">Déjà payé</div>
                    <div className="text-xs font-semibold text-emerald-600">
                      {dejaPaye.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-medium">Reste dû</div>
                    <div className="text-xs font-semibold text-red-600">
                      {resteAvant.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                </div>

                {/* Formulaire de saisie */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="montantVerse" className="text-xs font-medium text-gray-700">
                        Montant versé (F CFA)
                      </Label>
                      {resteAvant > 0 && (
                        <button
                          type="button"
                          onClick={() => setMontantSaisi(String(resteAvant))}
                          className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Solder le reste ({resteAvant.toLocaleString("fr-FR")} F)</span>
                        </button>
                      )}
                    </div>
                    <Input
                      id="montantVerse"
                      type="number"
                      required
                      min={1}
                      max={resteAvant}
                      value={montantSaisi}
                      onChange={(e) => setMontantSaisi(e.target.value)}
                      placeholder="Ex : 10000"
                      className="font-mono"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label htmlFor="datePaiement" className="text-xs font-medium text-gray-700">
                        Date du versement
                      </Label>
                      <Input
                        id="datePaiement"
                        type="date"
                        required
                        value={datePaiement}
                        onChange={(e) => setDatePaiement(e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>

                    <div>
                      <Label htmlFor="modePaiement" className="text-xs font-medium text-gray-700">
                        Mode de paiement
                      </Label>
                      <div className="mt-1">
                        <Select
                          value={modePaiement}
                          onValueChange={(v) => setModePaiement(v as ModePaiement)}
                        >
                          <SelectTrigger id="modePaiement" className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODES_PAIEMENT.map((m) => (
                              <SelectItem key={m} value={m} className="text-xs">
                                {MODE_PAIEMENT_LABELS[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages d'état clairs et concis */}
                {estDepassement && (
                  <div className="p-2.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Le montant dépasse le reste dû ({resteAvant.toLocaleString("fr-FR")} F).</span>
                  </div>
                )}

                {estSoldeComplet && (
                  <div className="p-2.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ce versement solde le mois. L&apos;élève sera réactivé immédiatement.</span>
                  </div>
                )}

                {estAcomptePartiel && (
                  <div className="p-2.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    <span>
                      Acompte : reste à payer de {nouveauResteTheorique.toLocaleString("fr-FR")} F. L&apos;élève reste suspendu.
                    </span>
                  </div>
                )}
              </DialogBody>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={fermerModal} disabled={isPending}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || montantNum <= 0 || estDepassement}
                  className={
                    estSoldeComplet
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-primary hover:bg-primary/90 text-white"
                  }
                >
                  {isPending
                    ? "Enregistrement..."
                    : estSoldeComplet
                      ? "Valider et réactiver l'élève"
                      : estAcomptePartiel
                        ? "Enregistrer l'acompte"
                        : "Valider"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
