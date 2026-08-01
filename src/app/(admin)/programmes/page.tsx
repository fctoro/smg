import type { Metadata } from "next";
import ProgrammesPageContent from "@/components/club/pages/ProgrammesPageContent";

export const metadata: Metadata = {
  title: "Programmes | FC Toro",
  description: "Gestion des programmes et matchs",
};

export default function ProgrammesPage() {
  return <ProgrammesPageContent />;
}
