import type { Metadata } from "next";
import ClubDashboardPage from "@/components/club/pages/ClubDashboardPage";

export const metadata: Metadata = {
  title: "Dashboard Club | FC Toro",
  description: "Tableau de bord d'administration pour un club sportif",
};

export default function DashboardPage() {
  return <ClubDashboardPage />;
}
