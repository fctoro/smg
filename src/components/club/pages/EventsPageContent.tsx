"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EventCalendarManager from "@/components/club/EventCalendarManager";
import { useClubData } from "@/context/ClubDataContext";
import { useUserRole } from "@/context/UserRoleContext";

export default function EventsPageContent() {
  const { events, setEvents, players } = useClubData();
  const { role, userEmail } = useUserRole();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Evenements" />
      <EventCalendarManager 
        events={events} 
        setEvents={setEvents} 
        players={players} 
        userEmail={userEmail}
        isSuperAdmin={role === "super admin"}
      />
    </div>
  );
}
