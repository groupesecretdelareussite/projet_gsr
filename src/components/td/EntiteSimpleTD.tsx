"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { TdConfigTabs } from "@/components/td/TdConfigTabs";
import { ACTIONS_HOVER_REVEAL, HOVER_ONLY_LABEL } from "@/lib/utils";

interface LigneSimple {
  id: number;
  nom: string;
}

interface EntiteSimpleTDProps {
  titre: string;
  titrePage: string;
  colonneLabel: string;
  rows: LigneSimple[];
  onCreer: (nom: string) => Promise<{ error?: string }>;
  onModifier: (id: number, nom: string) => Promise<{ error?: string }>;
  onSupprimer: (id: number) => Promise<{ error?: string }>;
}

/** Composant générique — Zones/Classes TD/Matières TD partagent la même forme (id + un seul champ texte). */
export function EntiteSimpleTD({ titre, titrePage, colonneLabel, rows, onCreer, onModifier, onSupprimer }: EntiteSimpleTDProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOuvert, setDialogOuvert] = useState<"nouveau" | number | null>(null);
  const [valeur, setValeur] = useState("");

  function ouvrirNouveau() {
    setValeur("");
    setDialogOuvert("nouveau");
  }

  function ouvrirModifier(ligne: LigneSimple) {
    setValeur(ligne.nom);
    setDialogOuvert(ligne.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result =
        dialogOuvert === "nouveau" ? await onCreer(valeur) : await onModifier(dialogOuvert as number, valeur);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(dialogOuvert === "nouveau" ? `${titre} créée` : `${titre} modifiée`);
      setDialogOuvert(null);
      router.refresh();
    });
  }

  function supprimer(ligne: LigneSimple) {
    if (!window.confirm(`Supprimer "${ligne.nom}" ?`)) return;
    startTransition(async () => {
      const result = await onSupprimer(ligne.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${titre} supprimée`);
      router.refresh();
    });
  }

  const columns: DataTableColumn<LigneSimple>[] = [
    { key: "nom", label: colonneLabel, render: (l) => <span className="font-medium">{l.nom}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (l) => (
        <div className={`flex flex-wrap gap-2 ${ACTIONS_HOVER_REVEAL}`}>
          <Button variant="outline" size="sm" onClick={() => ouvrirModifier(l)}>
            <Pencil className="w-3.5 h-3.5" />
            <span className={HOVER_ONLY_LABEL}>Modifier</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => supprimer(l)} disabled={isPending}>
            <Trash2 className="w-3.5 h-3.5" />
            <span className={HOVER_ONLY_LABEL}>Supprimer</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={titrePage}
        subtitle={`${rows.length} ${colonneLabel.toLowerCase()}(s)`}
        actions={
          <Button size="sm" onClick={ouvrirNouveau}>
            <Plus className="w-3.5 h-3.5" />
            Nouveau
          </Button>
        }
      />
      <TdConfigTabs />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        emptyState={<EmptyState icon={Plus} title="Aucune donnée" description={`Ajoutez la première entrée.`} />}
      />

      <Dialog open={dialogOuvert !== null} onOpenChange={(open) => !open && setDialogOuvert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogOuvert === "nouveau" ? `Nouvelle ${titre.toLowerCase()}` : `Modifier`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <Label htmlFor="nom">{colonneLabel}</Label>
              <Input id="nom" required value={valeur} onChange={(e) => setValeur(e.target.value)} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOuvert(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending || !valeur.trim()}>
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
