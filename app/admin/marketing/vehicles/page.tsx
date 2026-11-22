"use client";

import { Car } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingVehiclesPage({ isMasterCatalog }: { isMasterCatalog?: boolean } = {}) {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="vehicles"
        title={isMasterCatalog ? "Master Vehicles Catalog" : "Vehicle Inventory"}
        description={
          isMasterCatalog
            ? "Centralized platform directory of all motor vehicles, commercial fleets, and EV inventory."
            : "Create and manage your business vehicle listings powered by centralized vehicle master data."
        }
        icon={Car}
        isMasterCatalog={isMasterCatalog}
      />
    </div>
  );
}
