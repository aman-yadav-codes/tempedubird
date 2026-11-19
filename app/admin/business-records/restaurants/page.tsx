"use client";

import { UtensilsCrossed } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function BusinessDishesPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="restaurants"
        title="Restaurant Dishes & Menu"
        description="Manage menu categories, dishes, variations, spice levels, allergens, and dietary profiles."
        icon={UtensilsCrossed}
      />
    </div>
  );
}
