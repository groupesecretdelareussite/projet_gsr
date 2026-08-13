"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { upsertNote } from "@/actions/notes";
import { TYPES_NOTE, TYPE_NOTE_LABELS, type TypeNote, type Semestre } from "@/lib/constants";

export interface EleveOption {
  id: number;
  nom: string;
  prenoms: string;
}

export interface MatiereOption {
  id: number;
  nom: string;
  code: string;
}

export interface NoteExistante {
  eleve_id: number;
  matiere_id: number;
  type_note: TypeNote;
  valeur: number;
}

type CellStatut = "idle" | "saving" | "saved" | "error";

function cellKey(eleveId: number, matiereId: number, typeNote: TypeNote): string {
  return `${eleveId}-${matiereId}-${typeNote}`;
}

export function NotesGrid({
  eleves,
  matieres,
  notesExistantes,
  anneeScolaireId,
  semestre,
}: {
  eleves: EleveOption[];
  matieres: MatiereOption[];
  notesExistantes: NoteExistante[];
  anneeScolaireId: number;
  semestre: Semestre;
}) {
  const [matiereActiveId, setMatiereActiveId] = useState(matieres[0]?.id);
  const [isPending, startTransition] = useTransition();

  const valeursInitiales = Object.fromEntries(
    notesExistantes.map((n) => [cellKey(n.eleve_id, n.matiere_id, n.type_note), String(n.valeur)])
  );
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => ({ ...valeursInitiales }));
  // Dernière valeur réellement sauvegardée par cellule — distincte de `valeurs`
  // (qui reflète la saisie en direct) pour pouvoir détecter un vrai changement au blur.
  const dernieresValeursSauvegardees = useRef<Record<string, string>>({ ...valeursInitiales });
  const [statuts, setStatuts] = useState<Record<string, CellStatut>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function setStatut(key: string, statut: CellStatut) {
    setStatuts((prev) => ({ ...prev, [key]: statut }));
    if (timers.current[key]) clearTimeout(timers.current[key]);
    if (statut === "saved") {
      timers.current[key] = setTimeout(() => {
        setStatuts((prev) => ({ ...prev, [key]: "idle" }));
      }, 1200);
    }
  }

  function handleBlur(eleveId: number, matiereId: number, typeNote: TypeNote) {
    const key = cellKey(eleveId, matiereId, typeNote);
    const brut = valeurs[key] ?? "";

    if (brut === (dernieresValeursSauvegardees.current[key] ?? "")) return; // rien à sauvegarder
    if (brut === "") return; // champ vidé — on ne supprime pas la note existante ici

    const valeur = Number(brut);
    if (Number.isNaN(valeur) || valeur < 0 || valeur > 20) {
      setStatut(key, "error");
      toast.error("La note doit être comprise entre 0 et 20");
      return;
    }

    setStatut(key, "saving");
    startTransition(async () => {
      const result = await upsertNote({ eleveId, matiereId, typeNote, valeur, anneeScolaireId, semestre });
      if (result.error) {
        setStatut(key, "error");
        toast.error(result.error);
        return;
      }
      dernieresValeursSauvegardees.current[key] = brut;
      setStatut(key, "saved");
    });
  }

  const matiereActive = matieres.find((m) => m.id === matiereActiveId) ?? matieres[0];

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-100 mb-4 overflow-x-auto">
        {matieres.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMatiereActiveId(m.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              m.id === matiereActive?.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {m.nom}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-primary/15 to-primary/5">
            <tr>
              <th className="sticky left-0 z-10 bg-primary/15 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-primary-dark whitespace-nowrap">
                Élève
              </th>
              {TYPES_NOTE.map((t) => (
                <th key={t} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary-dark">
                  {TYPE_NOTE_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eleves.map((eleve) => (
              <tr key={eleve.id} className="group hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 text-gray-700 whitespace-nowrap group-hover:bg-gray-50">
                  {eleve.nom} {eleve.prenoms}
                </td>
                {TYPES_NOTE.map((typeNote) => {
                  if (!matiereActive) return <td key={typeNote} />;
                  const key = cellKey(eleve.id, matiereActive.id, typeNote);
                  const statut = statuts[key] ?? "idle";

                  return (
                    <td key={typeNote} className="px-1 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.25}
                        value={valeurs[key] ?? ""}
                        onChange={(e) => setValeurs((prev) => ({ ...prev, [key]: e.target.value }))}
                        onBlur={() => handleBlur(eleve.id, matiereActive.id, typeNote)}
                        disabled={isPending && statut === "saving"}
                        className={cn(
                          "w-16 mx-auto block text-center px-2 py-2.5 border rounded-md text-sm transition-colors",
                          statut === "saving" && "border-amber-400 bg-amber-50",
                          statut === "saved" && "border-green-400 bg-green-50",
                          statut === "error" && "border-red-400 bg-red-50",
                          statut === "idle" && "border-gray-200"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
