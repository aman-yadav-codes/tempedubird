import type { Metadata } from "next";
import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { resolvePageMetadata } from "@/lib/seo/metadata";
import { TeamPageView } from "@/components/public/team-page-view";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return resolvePageMetadata("/team", profile?.id, {
    title: `Our Team & Leadership | ${name}`,
    description: `Meet the experienced administrators, department heads, and academic leadership team of ${name}.`,
    alternates: {
      canonical: "/team",
    },
    openGraph: {
      title: `Our Team & Leadership - ${name}`,
      description: `Meet the experienced educators and administrative leaders of ${name}.`,
      url: "/team",
      siteName: name,
      type: "website",
    },
  });
}

export const dynamic = "force-dynamic";

export default function PublicTeamPage() {
  return <TeamPageView />;
}
