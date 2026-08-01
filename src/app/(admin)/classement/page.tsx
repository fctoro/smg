import type { Metadata } from "next";
import StandingsPageContent from "@/components/club/pages/StandingsPageContent";

export const metadata: Metadata = {
  title: "Classement | FC Toro",
  description: "Classement et resultats de championnat du club",
};

export default function StandingsPage() {
  return <StandingsPageContent />;
}

