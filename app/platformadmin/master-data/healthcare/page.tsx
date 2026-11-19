import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function HealthcareMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="healthcare"
      title="Patient & Healthcare Masters Management"
      subtitle="Manage patient categories, subcategories, medical departments, clinical specialties, consultation types, admission modes, and care types."
      iconName="HeartPulse"
      accentColor="from-rose-600 to-red-600"
    />
  );
}
