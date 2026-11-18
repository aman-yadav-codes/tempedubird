"use client";

import { Building2 } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingPropertiesPage({ isMasterCatalog }: { isMasterCatalog?: boolean } = {}) {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="properties"
        title="Property Listings"
        description="Create and manage your real estate properties powered by centralized property master data."
        icon={Building2}
      />
    </div>
  );
}
