import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";
import { AboutOverviewPageView } from "@/components/public/about-overview-page-view";
import { resolvePageMetadata } from "@/lib/seo/metadata";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return resolvePageMetadata("/about", profile?.id, {
    title: `About Us | ${name} — Organization & Campus Overview`,
    description: profile?.about ?? "Learn more about our institution, establishment, campus infrastructure, and official certifications.",
  });
}

export default async function AboutPage() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const companyPage = await getCompanyPageBySlug(db, "about-us");

  return <AboutOverviewPageView initialProfile={profile} companyPage={companyPage} />;
}
