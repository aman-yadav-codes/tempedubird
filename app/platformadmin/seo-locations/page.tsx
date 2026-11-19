import { Metadata } from "next";
import { SeoLocationsManager } from "@/components/platform-admin/seo-locations/seo-locations-manager";

export const metadata: Metadata = {
  title: "SEO Locations | Platform Admin",
  description: "Mark categories and locations that should be available for SEO pages and public directory listings.",
};

export default function PlatformAdminSeoLocationsPage() {
  return <SeoLocationsManager />;
}
