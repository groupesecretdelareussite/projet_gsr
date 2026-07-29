"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { definirCoefficient, supprimerCoefficient } from "@/actions/coefficients";

interface MatiereLigne {
  matiereId: number;
  nomMatiere: string;
  coefficientActuel: number | null;
}

export function CoefficientsTable({ classeId, matieres }: { classeId: number; matieres: MatiereLigne[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valeurs, setValeurs] = useState<Record<number, string>>(
    Object.fromEntries(matieres.map((m) => [m.matiereId, m.coefficientActuel !== null ? String(m.coefficientActuel) : ""]))
  );

  function enregistrer(matiereId: number) {
    const valeur = Number(valeurs[matiereId]);
    if (!(valeur > 0)) {
      toast.error("Le coefficient doit être supérieur à 0");
      return;
    }
    startTransition(async () => {
      const result = await definirCoefficient(classeId, matiereId, valeur);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Coefficient enregistré");
      router.refresh();
    });
  }

  function reinitialiser(matiereId: number) {
    startTransition(async () => {
      const result = await supprimerCoefficient(classeId, matiereId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setValeurs((v) => ({ ...v, [matiereId]: "" }));
      toast.success("Coefficient réinitialisé");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
      {matieres.map((m) => (
        <div key={m.matiereId} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{m.nomMatiere}</span>
            {m.coefficientActuel === null && <Badge variant="warning">Non configuré</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0.5"
              step="0.5"
              value={valeurs[m.matiereId] ?? ""}
              onChange={(e) => setValeurs((v) => ({ ...v, [m.matiereId]: e.target.value }))}
              className="w-24"
            />
            <Button size="sm" onClick={() => enregistrer(m.matiereId)} disabled={isPending}>
              <Save className="w-3.5 h-3.5" />
              Enregistrer
            </Button>
            {m.coefficientActuel !== null && (
              <Button variant="outline" size="sm" onClick={() => reinitialiser(m.matiereId)} disabled={isPending}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
