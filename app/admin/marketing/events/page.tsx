"use client";

import { CalendarDays } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingEventsPage({ isMasterCatalog }: { isMasterCatalog?: boolean } = {}) {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="events"
        title={isMasterCatalog ? "Master Events Catalog" : "Events & Ticket Programs"}
        description={
          isMasterCatalog
            ? "Centralized platform directory of all conferences, cultural festivals, ticketed shows, and sports meets."
            : "Create and organize events, schedules, speakers, and ticket tiers powered by centralized master data."
        }
        icon={CalendarDays}
        isMasterCatalog={isMasterCatalog}
      />
    </div>
  );
}
