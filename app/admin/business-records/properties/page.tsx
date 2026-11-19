"use client";

import { Building2 } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessPropertiesPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="properties"
        title="Property Listings"
        description="Manage residential, commercial, and land listings with pricing, specifications, and amenities."
        icon={Building2}
      />
    </div>
  );
}
