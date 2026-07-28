"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface SiteOption {
  id: number;
  nom_site: string;
}

export function SiteSelector({ sites, selectedSiteId }: { sites: SiteOption[]; selectedSiteId: number | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={selectedSiteId ? String(selectedSiteId) : ""} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Choisir un site" />
      </SelectTrigger>
      <SelectContent>
        {sites.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.nom_site}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
