"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ROLES, ROLE_LABELS, type UserRole } from "@/lib/constants";

interface SiteOption {
  id: number;
  nom_site: string;
}

interface RoleSiteFieldsProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  siteId: string;
  onSiteIdChange: (siteId: string) => void;
  siteIds: number[];
  onSiteIdsChange: (siteIds: number[]) => void;
  sites: SiteOption[];
}

/** §8.9 GSR_ARCHITECTURE.md — champs de scope conditionnels au rôle, partagés entre création et modification. */
export function RoleSiteFields({
  role,
  onRoleChange,
  siteId,
  onSiteIdChange,
  siteIds,
  onSiteIdsChange,
  sites,
}: RoleSiteFieldsProps) {
  function toggleSite(id: number) {
    onSiteIdsChange(siteIds.includes(id) ? siteIds.filter((s) => s !== id) : [...siteIds, id]);
  }

  return (
    <>
      <div>
        <Label>Rôle</Label>
        <Select value={role} onValueChange={(v) => onRoleChange(v as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {role === "chef_site" && (
        <div>
          <Label>Site</Label>
          <Select value={siteId} onValueChange={onSiteIdChange}>
            <SelectTrigger>
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
        </div>
      )}

      {role === "superviseur" && (
        <div>
          <Label>Sites (au moins 1)</Label>
          <div className="space-y-2 border border-gray-200 rounded-lg p-3 max-h-40 overflow-auto">
            {sites.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteIds.includes(s.id)}
                  onChange={() => toggleSite(s.id)}
                  className="rounded border-gray-300 text-primary focus:ring-primary/20"
                />
                {s.nom_site}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
