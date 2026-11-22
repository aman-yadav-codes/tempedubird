"use client";

import { BedDouble } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingRoomsPage({ isMasterCatalog }: { isMasterCatalog?: boolean } = {}) {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="hotels"
        title={isMasterCatalog ? "Master Rooms & Stay Catalog" : "Hotel Rooms & Accommodations"}
        description={
          isMasterCatalog
            ? "Centralized platform directory of all hotel rooms, suites, homestays, and resort accommodations."
            : "Create and manage your hotel rooms, bed configurations, and rates powered by centralized master data."
        }
        icon={BedDouble}
        isMasterCatalog={isMasterCatalog}
      />
    </div>
  );
}
