import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";
import { FounderPageView } from "@/components/public/founder-page-view";
import { resolvePageMetadata } from "@/lib/seo/metadata";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";
  const founderName = profile?.founder_name ?? "Founder";

  return resolvePageMetadata("/about/founder", profile?.id, {
    title: `About Founder | ${founderName} — ${name}`,
    description: profile?.founder_about ?? `Learn about the founder, executive vision, and leadership of ${name}.`,
  });
}

export default async function FounderPage() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const companyPage = await getCompanyPageBySlug(db, "about-founder");

  return <FounderPageView initialProfile={profile} companyPage={companyPage} />;
}
