import { describe, it, expect } from "vitest";
import { siteInScope, type UserScope } from "./auth-scope";

function makeScope(overrides: Partial<UserScope>): UserScope {
  return {
    userId: "u1",
    username: "test",
    role: "chef_site",
    siteId: null,
    siteIds: [],
    isGlobal: false,
    ...overrides,
  };
}

describe("siteInScope (§5.4)", () => {
  it("un rôle global (coordonnateur/comptable) a accès à n'importe quel site", () => {
    const scope = makeScope({ role: "coordonnateur", isGlobal: true });
    expect(siteInScope(scope, 1)).toBe(true);
    expect(siteInScope(scope, 999)).toBe(true);
  });

  it("un superviseur n'a accès qu'à ses sites assignés (user_sites)", () => {
    const scope = makeScope({ role: "superviseur", siteIds: [1, 2] });
    expect(siteInScope(scope, 1)).toBe(true);
    expect(siteInScope(scope, 2)).toBe(true);
    expect(siteInScope(scope, 3)).toBe(false);
  });

  it("un chef_site n'a accès qu'à son unique site", () => {
    const scope = makeScope({ role: "chef_site", siteId: 5 });
    expect(siteInScope(scope, 5)).toBe(true);
    expect(siteInScope(scope, 6)).toBe(false);
  });
});
