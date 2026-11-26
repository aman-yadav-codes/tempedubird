"use client";

import { UtensilsCrossed } from "lucide-react";
import { BusinessRecordManager } from "@/components/business/records/business-record-manager";

export default function MarketingDishesPage({ isMasterCatalog }: { isMasterCatalog?: boolean } = {}) {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BusinessRecordManager
        vertical="restaurants"
        title={isMasterCatalog ? "Master Dishes Catalog" : "Restaurant Dishes & Menu"}
        description={
          isMasterCatalog
            ? "Centralized platform directory of all restaurant culinary menus, food items, and specialty dishes."
            : "Create and manage your dishes, menu categories, variants, and dietary profiles powered by master data."
        }
        icon={UtensilsCrossed}
        isMasterCatalog={isMasterCatalog}
      />
    </div>
  );
}
