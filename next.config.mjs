/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 bloque par défaut le JS du serveur de dev pour toute origine
  // différente de localhost — nécessaire pour tester depuis un téléphone sur
  // le même réseau WiFi via l'IP locale. Dev uniquement, sans effet en prod.
  allowedDevOrigins: ["192.168.1.4"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Audit sécurité 2026-08-10. CSP volontairement sans nonce (choix client) :
  // script-src/style-src gardent 'unsafe-inline' pour ne pas forcer les pages
  // vitrine actuellement statiques à repasser en rendu dynamique — origines
  // externes limitées à ce que l'app charge réellement (Supabase + l'embed
  // Google Maps de CarteSites.tsx, vérifiés par grep). HSTS sans
  // includeSubDomains/preload pour l'instant : irréversible pendant sa durée
  // de vie si un sous-domaine hors Vercel n'est pas encore en HTTPS partout —
  // à durcir une fois ce point confirmé.
  // cdnjs.cloudflare.com ajouté le 2026-08-11 : les drapeaux de PhoneInput
  // (react-international-phone, champs contact_parent) chargent leurs SVG
  // Twemoji depuis ce CDN — invisible dans le grep initial car dépendance
  // transitive d'une librairie, pas un chargement fait par notre propre code.
  //
  // Header désactivé hors production (2026-08-15) : `upgrade-insecure-requests`
  // réécrit toute requête http:// de la page en https:// — sans effet sur
  // localhost (origine considérée sûre par le navigateur), mais casse tout
  // chargement d'asset (CSS/JS/polices) dès qu'on teste via l'IP locale
  // (téléphone sur le même WiFi, cf. allowedDevOrigins) puisque le serveur de
  // dev ne parle pas TLS. Même schéma que l'ancien souci `unsafe-eval` : cette
  // CSP protège la prod, pas le serveur de dev.
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.supabase.co https://cdnjs.cloudflare.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src https://www.google.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
