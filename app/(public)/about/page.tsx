import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";
import { AboutPageView } from "@/components/public/about-page-view";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `About ${name} | Mission, Vision, Goals & Leadership`,
    description: profile?.about ?? "Learn more about our institution, mission, vision, goals, and leadership.",
  };
}

export default async function AboutPage() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const companyPage = await getCompanyPageBySlug(db, "about-us");

  return <AboutPageView initialProfile={profile} companyPage={companyPage} />;
}
