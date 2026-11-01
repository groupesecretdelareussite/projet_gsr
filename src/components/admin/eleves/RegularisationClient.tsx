"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  Wallet,
  ShieldCheck,
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

  // Filtrage en direct
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

  // Ouverture du modal pour un élève donné
  function ouvrirModal(e: EleveSuspenduDefautPaiement) {
    setEleveSelectionne(e);
    // Par défaut, pré-remplir avec son reste dû pour faciliter le cas 100%
    const resteAvant = Math.max(0, e.montantAttendu - e.dejaPaye);
    setMontantSaisi(String(resteAvant));
    setDatePaiement(getHierIso());
    setModePaiement("MoMo");
  }

  function fermerModal() {
    setEleveSelectionne(null);
    setMontantSaisi("");
  }

  // Calcul temps réel de la catégorie
  const montantNum = Number(montantSaisi) || 0;
  const fraisAttendu = eleveSelectionne ? eleveSelectionne.montantAttendu : 0;
  const dejaPaye = eleveSelectionne ? eleveSelectionne.dejaPaye : 0;
  const resteAvant = Math.max(0, fraisAttendu - dejaPaye);
  const totalPayeTheorique = dejaPaye + montantNum;

  const estDepassement = montantNum > resteAvant; // Cas 1
  const estSoldeComplet = montantNum > 0 && totalPayeTheorique === fraisAttendu; // Cas 2
  const estAcomptePartiel = montantNum > 0 && totalPayeTheorique < fraisAttendu; // Cas 3
  const nouveauResteTheorique = Math.max(0, resteAvant - montantNum);

  function handleValider(e: React.FormEvent) {
    e.preventDefault();
    if (!eleveSelectionne) return;

    if (montantNum <= 0) {
      toast.error("Veuillez saisir un montant versé strictement positif.");
      return;
    }

    if (estDepassement) {
      toast.error("Dépassement interdit : le montant versé ne peut pas dépasser le reste dû.");
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

      // Mise à jour de l'état local pour un feedback instantané sans recharger
      if (res.categorie === "solde_complet") {
        // Retiré de la liste des suspendus
        setEleves((prev) => prev.filter((el) => el.id !== eleveSelectionne.id));
      } else if (res.categorie === "acompte_partiel") {
        // Dette mise à jour dans la liste
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
    <div className="space-y-6">
      {/* Bouton retour et entête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/eleves/suspendus"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux élèves suspendus</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>Régularisation des suspensions</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              Paiements en ligne tardifs
            </span>
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez un à un chaque élève suspendu au 1er du mois dont le règlement en ligne a été effectué
            avant la coupure mais saisi avec décalage.
          </p>
        </div>
      </div>

      {/* Guide des 3 cas métier */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-red-100 bg-red-50/70 text-red-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>Cas 1 : Dépassement interdit</span>
          </div>
          <p className="text-red-700">
            Si <code>Versement + Déjà payé &gt; Frais attendus</code>, l&apos;action est bloquée avec alerte
            explicative. Aucun trop-perçu n&apos;est toléré.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/70 text-emerald-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Cas 2 : Rétablissement immédiat</span>
          </div>
          <p className="text-emerald-700">
            Si <code>Versement + Déjà payé = Frais attendus</code> (100% soldé), la suspension est levée,
            l&apos;élève redevient <strong>Actif</strong> sans pénalité (0 F).
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/70 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Clock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Cas 3 : Maintien de suspension</span>
          </div>
          <p className="text-amber-700">
            Si <code>Versement + Déjà payé &lt; Frais attendus</code> (acompte partiel), l&apos;élève reste{" "}
            <strong>Suspendu</strong> mais sa dette est réajustée avec précision.
          </p>
        </div>
      </div>

      {/* Barre de recherche et statut de la file */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, matricule, classe ou site..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{elevesFiltres.length}</span> élève(s) en attente
        </div>
      </div>

      {/* Tableau / Liste des élèves suspendus pour défaut de paiement */}
      {elevesFiltres.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-xl border border-gray-200">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">Aucun dossier en attente</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            {recherche.trim()
              ? "Aucun élève suspendu ne correspond à votre recherche."
              : "Tous les élèves suspendus pour défaut de paiement ont été régularisés ou sont à jour."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Matricule</th>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Classe & Site</th>
                  <th className="px-4 py-3">Mois concerné</th>
                  <th className="px-4 py-3">Scolarité totale</th>
                  <th className="px-4 py-3">Déjà réglé</th>
                  <th className="px-4 py-3">Reste dû actuel</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {elevesFiltres.map((el) => {
                  const reste = Math.max(0, el.montantAttendu - el.dejaPaye);
                  return (
                    <tr key={el.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{el.matricule}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {el.nom} {el.prenoms}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span>{el.nomClasse}</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-xs text-gray-500">{el.nomSite}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">{el.moisSouscription}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {el.montantAttendu.toLocaleString("fr-FR")} F
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-600">
                        {el.dejaPaye > 0 ? `${el.dejaPaye.toLocaleString("fr-FR")} F` : "0 F"}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-red-600">
                        {reste.toLocaleString("fr-FR")} F
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => ouvrirModal(el)}
                          className="bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-xs"
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Régulariser un paiement</span>
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Saisissez le versement en ligne reçu pour mettre à jour ou lever la suspension.
            </DialogDescription>
          </DialogHeader>

          {eleveSelectionne && (
            <form onSubmit={handleValider}>
              <DialogBody className="space-y-4">
                {/* Carte d'identité de l'élève */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">
                      {eleveSelectionne.nom} {eleveSelectionne.prenoms}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {eleveSelectionne.matricule} — {eleveSelectionne.nomClasse} ({eleveSelectionne.nomSite})
                    </div>
                  </div>
                  <Badge variant="warning">Suspension {eleveSelectionne.moisSouscription}</Badge>
                </div>

                {/* Résumé financier du mois */}
                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-lg border border-gray-100 bg-white">
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase font-semibold">Total attendu</div>
                    <div className="text-sm font-bold text-gray-800">
                      {fraisAttendu.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase font-semibold">Déjà réglé</div>
                    <div className="text-sm font-bold text-emerald-600">
                      {dejaPaye.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500 uppercase font-semibold">Reste dû max</div>
                    <div className="text-sm font-bold text-red-600">
                      {resteAvant.toLocaleString("fr-FR")} F
                    </div>
                  </div>
                </div>

                {/* Saisie du versement */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="montantVerse" className="text-sm font-semibold text-gray-900">
                        Montant versé par le parent (F CFA)
                      </Label>
                      {resteAvant > 0 && (
                        <button
                          type="button"
                          onClick={() => setMontantSaisi(String(resteAvant))}
                          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Remplir solde exact ({resteAvant.toLocaleString("fr-FR")} F)</span>
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
                      className="text-lg font-mono font-bold"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="datePaiement" className="text-xs font-medium text-gray-700">
                        Date réelle du versement
                      </Label>
                      <Input
                        id="datePaiement"
                        type="date"
                        required
                        value={datePaiement}
                        onChange={(e) => setDatePaiement(e.target.value)}
                        className="mt-1"
                      />
                      <span className="text-[11px] text-gray-500">
                        Par défaut hier ({formaterDateCourt(getHierIso())})
                      </span>
                    </div>

                    <div>
                      <Label htmlFor="modePaiement" className="text-xs font-medium text-gray-700">
                        Canal d&apos;encaissement
                      </Label>
                      <div className="mt-1">
                        <Select
                          value={modePaiement}
                          onValueChange={(v) => setModePaiement(v as ModePaiement)}
                        >
                          <SelectTrigger id="modePaiement">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODES_PAIEMENT.map((m) => (
                              <SelectItem key={m} value={m}>
                                {MODE_PAIEMENT_LABELS[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-[11px] text-gray-500">Mobile Money ou Présentiel</span>
                    </div>
                  </div>
                </div>

                {/* BANDEAU TEMPS RÉEL SELON LES 3 CAS */}
                {estDepassement && (
                  <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-red-800 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Cas 1 : Dépassement non autorisé</span>
                    </div>
                    <p>
                      Le montant versé ({montantNum.toLocaleString("fr-FR")} F) dépasse le reste dû maximal (
                      {resteAvant.toLocaleString("fr-FR")} F). Aucun trop-perçu n&apos;est toléré. Veuillez
                      rectifier le montant.
                    </p>
                  </div>
                )}

                {estSoldeComplet && (
                  <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cas 2 : Mois intégralement soldé (100 %)</span>
                    </div>
                    <p className="text-emerald-800">
                      Ce versement clôture la totalité des frais pour {eleveSelectionne.moisSouscription}.
                      L&apos;élève sera <strong>rétabli immédiatement</strong> au statut actif sans aucune
                      pénalité (0 F). La quittance sera disponible.
                    </p>
                  </div>
                )}

                {estAcomptePartiel && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Cas 3 : Acompte partiel — Maintien de suspension</span>
                    </div>
                    <p className="text-amber-800">
                      Ce versement est enregistré en comptabilité. L&apos;élève restera suspendu avec un
                      reliquat actualisé à <strong>{nouveauResteTheorique.toLocaleString("fr-FR")} F</strong>.
                      La dette sera mise à jour sur le portail parents.
                    </p>
                  </div>
                )}
              </DialogBody>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={fermerModal} disabled={isPending}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || montantNum <= 0 || estDepassement}
                  className={
                    estSoldeComplet
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-primary hover:bg-primary/90 text-white"
                  }
                >
                  {isPending
                    ? "Régularisation en cours..."
                    : estSoldeComplet
                      ? "Rétablir l'élève (Solde 100%)"
                      : estAcomptePartiel
                        ? "Enregistrer acompte (Maintien)"
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
