"use client";

import { BedDouble } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingRoomsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="hotels"
        title="Hotel Rooms & Accommodations"
        description="Create and manage your hotel rooms, bed configurations, and rates powered by centralized master data."
        icon={BedDouble}
      />
    </div>
  );
}
