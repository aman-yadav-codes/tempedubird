import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { GalleryPageView } from "@/components/public/gallery-page-view";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `Campus Gallery | ${name}`,
    description: `Browse the photo gallery, infrastructure, laboratory setups, and campus facilities of ${name}.`,
  };
}

export default function GalleryPage() {
  return <GalleryPageView />;
}
