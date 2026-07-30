import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Non Trouvée | FC Toro",
  description: "Désolé, la page que vous recherchez n'existe pas.",
};

export default function Error404() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-gray-800 font-sans">
      <div className="flex flex-col items-center text-center max-w-md space-y-8">
        {/* Logo FC Toro */}
        <div className="relative transform hover:scale-105 transition-transform duration-300">
          <Image
            src="/images/logo/fc-toro.png"
            alt="FC Toro Logo"
            width={180}
            height={180}
            className="rounded-xl object-contain drop-shadow-md"
            priority
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-800">
            Page Non Trouvée
          </h2>
          <p className="text-gray-500 text-base leading-relaxed">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-6 text-sm font-semibold transition-colors shadow-theme-xs cursor-pointer"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
