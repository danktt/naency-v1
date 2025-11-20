"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 text-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-2xl font-bold">
              Næncy
            </Link>
            <p className="text-gray-400 text-sm mt-2">
              © {new Date().getFullYear()} Næncy. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6">
            <Link
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Política de Privacidade
            </Link>
            <Link
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Termos de Serviço
            </Link>
            <Link
              href="#"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Contato
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
