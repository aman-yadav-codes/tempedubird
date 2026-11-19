import { VerticalMasterManager } from "@/components/admin/master-data/vertical-master-manager";

export default function EventMastersPage() {
  return (
    <VerticalMasterManager
      verticalCode="events"
      title="Event & Ticketing Masters Management"
      subtitle="Standardize corporate, entertainment, social, and sports event categories, subcategories, event formats, amenities, and ticket tiers."
      iconName="CalendarDays"
      accentColor="from-fuchsia-600 to-pink-600"
    />
  );
}
