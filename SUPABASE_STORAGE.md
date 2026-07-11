# Images de la vitrine dans Supabase Storage

1. Dans Supabase, créez le bucket `galerie` et rendez-le public : les visuels de la vitrine doivent pouvoir être consultés sans connexion.
2. Chargez les fichiers en conservant une organisation simple, par exemple `vitrine/accueil/`, `vitrine/programmes/` et `vitrine/galerie/`.
3. Utilisez les URLs publiques au format :

   `https://<project-ref>.supabase.co/storage/v1/object/public/galerie/<chemin-du-fichier>`

4. Remplacez progressivement les chemins locaux `/images/...` dans les pages de la vitrine par ces URLs. La configuration Next.js autorise déjà ces images distantes.
5. Ajoutez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans les variables d'environnement du projet Vercel. Ne placez jamais une clé `service_role` dans Vercel côté navigateur ni dans le dépôt.

Les images locales actuelles restent utilisables pendant la transition.
