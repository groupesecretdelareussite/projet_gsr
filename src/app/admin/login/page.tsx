import Link from 'next/link';
export default function AdminLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Connexion Admin / Espace Staff</h1>
      <p className="text-gray-600 mb-6">Page de connexion (à implémenter).</p>
      <Link href="/" className="text-primary hover:underline">Retour à l'accueil</Link>
    </div>
  );
}
