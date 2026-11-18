"use client";

import { Car } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessVehiclesPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="vehicles"
        title="Vehicle Inventory"
        description="Manage your dealership vehicles, specifications, commercial terms, and inventory status."
        icon={Car}
      />
    </div>
  );
}
