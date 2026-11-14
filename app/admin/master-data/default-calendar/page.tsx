import { InstituteCalendarPageContent } from "@/app/admin/master-data/institute-calendar/page";
import { MasterCatalogNavTabs } from "@/components/admin/catalog/master-catalog-nav-tabs";

export default function DefaultCalendarPage() {
  return (
    <div className="space-y-4">
      <MasterCatalogNavTabs />
      <InstituteCalendarPageContent defaultCalendarMode />
    </div>
  );
}
