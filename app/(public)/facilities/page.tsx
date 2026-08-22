import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { redirect } from "next/navigation";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `Campus Facilities & Infrastructure | ${name}`,
    description: `Explore laboratories, modern amphitheaters, sports complexes, and student facilities at ${name}.`,
  };
}

export default function FacilitiesPage() {
  redirect("/about#facilities");
}
