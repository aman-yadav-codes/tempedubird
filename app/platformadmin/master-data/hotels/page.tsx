import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function HotelMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="hotels"
      title="Hotel & Hospitality Masters Management"
      subtitle="Configure room categories, subcategories, room types, bed arrangements, room amenities, view types, occupancy limits, and meal plans."
      iconName="BedDouble"
      accentColor="from-purple-600 to-violet-600"
    />
  );
}
