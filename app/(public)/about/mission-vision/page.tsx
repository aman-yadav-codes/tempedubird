import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";
import { MissionVisionPageView } from "@/components/public/mission-vision-page-view";
import { resolvePageMetadata } from "@/lib/seo/metadata";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return resolvePageMetadata("/about/mission-vision", profile?.id, {
    title: `Mission, Vision & Strategic Goals | ${name}`,
    description: profile?.mission ?? `Discover the mission, vision, and core strategic goals of ${name}.`,
  });
}

export default async function MissionVisionPage() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const companyPage = await getCompanyPageBySlug(db, "mission-vision-goal");

  return <MissionVisionPageView initialProfile={profile} companyPage={companyPage} />;
}
