"use client";

import { CalendarDays } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessEventsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="events"
        title="Events & Ticket Programs"
        description="Organize in-person and online events, schedules, speakers, venue details, and ticket tiers."
        icon={CalendarDays}
      />
    </div>
  );
}
