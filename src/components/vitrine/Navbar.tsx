"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

const navLinks = [
  { name: "Accueil", href: "/" },
  { name: "Programmes", href: "/programmes" },
  { name: "Sites", href: "/sites" },
  { name: "Actualités", href: "/actualites" },
  { name: "Tarifs", href: "/tarifs" },
  { name: "À propos", href: "/apropos" },
  { name: "Galerie", href: "/galerie" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="GSR Logo" width={32} height={32} className="h-8 w-auto object-contain scale-150 translate-y-1" />
              <span className="font-bold text-2xl text-primary-dark block">G.S.R</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.href ? "text-primary border-b-2 border-primary py-1" : "text-gray-700"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Espace Staff Button (Desktop) */}
          <div className="hidden md:flex items-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/25 bg-primary/5 hover:bg-primary hover:text-white text-primary text-sm font-semibold transition-all duration-200 shadow-xs hover:shadow-md hover:scale-[1.02]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Espace Staff</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMobileMenuOpen}
              className="p-2.5 text-gray-700 hover:text-primary focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="relative block w-5 h-4">
                <span
                  className={`absolute left-0 h-0.5 w-5 bg-current rounded-full transition-all duration-300 ${
                    isMobileMenuOpen ? "top-[7px] rotate-45" : "top-0 rotate-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 bg-current rounded-full transition-opacity duration-300 ${
                    isMobileMenuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 h-0.5 w-5 bg-current rounded-full transition-all duration-300 ${
                    isMobileMenuOpen ? "top-[7px] -rotate-45" : "top-[14px] rotate-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-gray-700 hover:text-primary hover:bg-gray-50"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/admin/login"
              className="flex items-center justify-center gap-2 w-full mt-4 text-center px-4 py-2.5 rounded-xl text-base font-semibold border border-primary/25 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Espace Staff</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
