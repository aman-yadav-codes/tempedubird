import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { ContactPageView } from "@/components/public/contact-page-view";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `Contact ${name} | Helplines, Campus Branches & Inquiries`,
    description: `Contact ${name} for course, admission, department helplines, and support enquiries.`,
  };
}

export default async function ContactPage() {
  return <ContactPageView />;
}
