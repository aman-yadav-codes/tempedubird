import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function VehicleMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="vehicles"
      title="Vehicle Masters Management"
      subtitle="Configure standardized vehicle types, categories, subcategories, brands, models, variants, fuel, transmission, body types, and vehicle conditions."
      iconName="Car"
      accentColor="from-blue-600 to-indigo-600"
    />
  );
}
