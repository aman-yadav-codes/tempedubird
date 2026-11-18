"use client";

import { BedDouble } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessHotelsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="hotels"
        title="Hotel Rooms & Accommodations"
        description="Manage guest room categories, bed configurations, seasonal tariffs, and room availability."
        icon={BedDouble}
      />
    </div>
  );
}
