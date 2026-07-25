import type { Metadata } from "next";
import CoachTacticsPage from "@/components/club/pages/CoachTacticsPage";

export const metadata: Metadata = {
  title: "Espace Coach | FC Toro",
  description: "Tactiques, compositions, classement et gestion d'equipe",
};

export default function CoachPage() {
  return <CoachTacticsPage />;
}
