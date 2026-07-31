import type { Metadata } from "next";
import CoachTabsWrapper from "./CoachTabsWrapper";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Espace Coach | FC Toro",
  description: "Tactiques, compositions, classement et gestion d'equipe",
};

import { CardSkeleton } from "@/components/ui/skeleton/Skeleton";

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="p-6 space-y-4"><CardSkeleton /><CardSkeleton /></div>}>
      <CoachTabsWrapper />
    </Suspense>
  );
}
