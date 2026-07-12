import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-dark text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Column 1: About */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white w-11 h-11 rounded-full inline-flex items-center justify-center">
                <Image src="/logo.png" alt="GSR Logo" width={32} height={32} className="h-8 w-auto object-contain scale-150 translate-y-0.5" />
              </div>
              <span className="font-bold text-lg leading-tight">GROUPE SECRET DE LA REUSSITE</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Le Groupe Secret de la Réussite (G.S.R) est votre partenaire d&apos;excellence pour l&apos;accompagnement scolaire, le renforcement de capacités et la réussite aux examens de vos enfants.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Liens utiles */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Liens utiles</h3>
            <ul className="space-y-4">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Accueil
                </Link>
              </li>
              <li>
                <Link href="/programmes" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Programmes
                </Link>
              </li>
              <li>
                <Link href="/portail-parents" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Portail parents
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Mentions légales
                </Link>
              </li>
              
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-300">
                <MapPin className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <span>Cotonou, Bénin</span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Phone className="h-5 w-5 text-secondary shrink-0" />
                <span>+229 01 96 08 40 67</span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Phone className="h-5 w-5 text-secondary shrink-0" />
                <span>+229 01 49 76 16 35</span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Mail className="h-5 w-5 text-secondary shrink-0" />
                <a href="mailto:contact@groupe-secretdelareussite.com" className="hover:text-white transition-colors">
                  contact@groupe-secretdelareussite.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Groupe Secret de la Réussite. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
