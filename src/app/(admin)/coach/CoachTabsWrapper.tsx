"use client";

import { useSearchParams } from "next/navigation";
import CoachTacticsPage from "@/components/club/pages/CoachTacticsPage";
import CoachPlayersPage from "@/components/club/pages/CoachPlayersPage";
import CoachDashboardPage from "@/components/club/pages/CoachDashboardPage";
import CoachAttendancePage from "@/components/club/pages/CoachAttendancePage";

export default function CoachTabsWrapper() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  if (tab === "effectif") {
    return <CoachPlayersPage />;
  }
  if (tab === "presences") {
    return <CoachAttendancePage />;
  }
  if (tab === "tactiques") {
    return (
      <CoachTacticsPage 
        planId={searchParams.get("planId")} 
        effectifId={searchParams.get("effectifId")} 
      />
    );
  }
  return <CoachDashboardPage />;
}
