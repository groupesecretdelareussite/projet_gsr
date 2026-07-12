"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { name: "Accueil", href: "/" },
  { name: "Programmes", href: "/programmes" },
  { name: "Sites", href: "/sites" },
  { name: "Actualités", href: "/actualites" },
  { name: "À propos", href: "/apropos" },
  { name: "Galerie", href: "/galerie" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
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
              className="inline-flex items-center justify-center px-6 py-2 border border-primary text-sm font-medium rounded-md text-primary bg-white hover:bg-primary/5 transition-colors"
            >
              Espace Staff
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="text-gray-700 hover:text-primary focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
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
              className="block w-full mt-4 text-center px-3 py-2 rounded-md text-base font-medium border border-primary text-primary hover:bg-primary/5"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Espace Staff
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
