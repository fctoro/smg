import type { Metadata } from "next";
import CoachTabsWrapper from "./CoachTabsWrapper";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Espace Coach | FC Toro",
  description: "Tactiques, compositions, classement et gestion d'equipe",
};

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Chargement...</div>}>
      <CoachTabsWrapper />
    </Suspense>
  );
}
