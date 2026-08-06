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
};

export default nextConfig;
