import type { ReactNode } from "react";
import { ParametresTabs } from "@/components/admin/parametres/ParametresTabs";

export default function ParametresLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <ParametresTabs />
      {children}
    </div>
  );
}
