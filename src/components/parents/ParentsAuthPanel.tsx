import { Wallet, NotebookText, CheckCircle2, ShieldCheck } from "lucide-react";

const FONCTIONNALITES = [
  { icon: Wallet, label: "Paiements" },
  { icon: NotebookText, label: "Notes" },
  { icon: CheckCircle2, label: "Présence" },
];

/** Panneau de gauche partagé entre connexion et création de compte (§9 GSR_ARCHITECTURE.md). */
export function ParentsAuthPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-primary-gradient flex-col justify-center px-16 py-12 relative overflow-hidden">
      <div className="relative">
        <div className="mb-10">
          <p className="text-white text-2xl font-bold tracking-widest">G. S. R</p>
          <div className="w-12 h-1 bg-white/40 rounded-full mt-3" />
        </div>

        <h1 className="text-white text-4xl font-bold leading-tight mb-4">
          Excellence académique et épanouissement personnel.
        </h1>
        <p className="text-white/80 text-base leading-relaxed mb-10 max-w-md">
          Le portail centralisé pour accompagner la réussite scolaire de vos enfants au quotidien.
        </p>

        <div className="grid grid-cols-3 gap-3 max-w-md">
          {FONCTIONNALITES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center gap-2 bg-white/10 rounded-xl py-6 border border-white/10"
            >
              <Icon className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-16 flex items-center gap-2 text-white/70 text-xs">
        <ShieldCheck className="w-4 h-4" />
        Certifié Sécurité GSR
      </div>
    </div>
  );
}
