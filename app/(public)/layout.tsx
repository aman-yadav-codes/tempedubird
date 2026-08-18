import { headers } from "next/headers";

import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { LeadTrackerProvider } from "@/components/public/lead-tracker-provider";
import { db } from "@/lib/db/db";
import {
  getPublicInstitutionNavItems,
  getPublicNavbarBrand,
  type PublicInstitutionNavItem,
  type PublicNavbarBrand,
} from "@/lib/api/public-nav";
import { getInstitutionTenantByHost } from "@/lib/tenancy/institution-domain";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  let tenant = null;
  let institutionNavItems: PublicInstitutionNavItem[] = [];
  let brand: PublicNavbarBrand = {
    name: "EduBird",
    logoUrl: "/icons/edubird.webp",
    isInstitution: false,
  };

  try {
    tenant = await getInstitutionTenantByHost(db, host);
    institutionNavItems = await getPublicInstitutionNavItems(tenant, host);
    brand = await getPublicNavbarBrand(tenant);
  } catch {
    tenant = null;
    institutionNavItems = [];
    brand = {
      name: "EduBird",
      logoUrl: "/icons/edubird.webp",
      isInstitution: false,
    };
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LeadTrackerProvider>
        <PublicNavbar
          brand={brand}
          showInstitutesLink={!tenant}
          institutionNavItems={institutionNavItems}
        />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </LeadTrackerProvider>
    </div>
  );
}
