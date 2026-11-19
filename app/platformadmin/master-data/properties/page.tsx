import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function PropertyMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="properties"
      title="Property Masters Management"
      subtitle="Manage real estate categories, subcategories, property types, ownership, furnishing, construction status, amenities, and listing types."
      iconName="Building2"
      accentColor="from-emerald-600 to-teal-600"
    />
  );
}
