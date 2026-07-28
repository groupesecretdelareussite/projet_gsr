import { describe, it, expect, beforeAll } from "vitest";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * §Niveau 3 — vérifie que la policy `paiements_acces` (sql/004_rls_policies.sql)
 * bloque réellement le rôle chef_site au niveau Postgres — pas seulement que
 * le code applicatif s'abstient de l'interroger (interdit #6).
 */
describe("RLS — public.paiements bloque chef_site (interdit #6)", () => {
  let chefSiteClient: SupabaseClient;

  beforeAll(async () => {
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = process.env.TEST_CHEF_SITE_EMAIL!;
    const password = process.env.TEST_CHEF_SITE_PASSWORD!;

    // Idempotent — crée le compte de test chef_site s'il n'existe pas déjà.
    const { data: existing } = await admin.from("users").select("id").eq("email", email).maybeSingle();

    if (!existing) {
      const { data: siteJonquet } = await admin.from("sites").select("id").eq("initiale", "J").single();
      if (!siteJonquet) {
        throw new Error("Site Jonquet introuvable — sql/005_seed.sql a-t-il été appliqué ?");
      }

      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError || !authUser.user) {
        throw new Error(`Échec création compte test chef_site : ${authError?.message}`);
      }

      const { error: insertError } = await admin.from("users").insert({
        id: authUser.user.id,
        username: "test-chefsite",
        email,
        role: "chef_site",
        site_id: siteJonquet.id,
        actif: true,
      });
      if (insertError) {
        await admin.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Échec création ligne public.users pour le compte test chef_site : ${insertError.message}`);
      }
    }

    chefSiteClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: signInError } = await chefSiteClient.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(`Échec connexion compte test chef_site : ${signInError.message}`);
    }
  });

  it("une session chef_site ne peut lire aucune ligne de public.paiements", async () => {
    const { data, error } = await chefSiteClient.from("paiements").select("id").limit(1);

    // RLS filtre silencieusement (pas d'erreur) — le vrai test est que
    // data soit vide, quel que soit le contenu réel de la table.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("une session chef_site ne peut lire aucune ligne de public.paiements_supprimes", async () => {
    const { data, error } = await chefSiteClient.from("paiements_supprimes").select("id").limit(1);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
