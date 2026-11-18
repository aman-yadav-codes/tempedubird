"use client";

import { UtensilsCrossed } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingDishesPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="restaurants"
        title="Restaurant Dishes & Menu"
        description="Create and manage your dishes, menu categories, variants, and dietary profiles powered by master data."
        icon={UtensilsCrossed}
      />
    </div>
  );
}
