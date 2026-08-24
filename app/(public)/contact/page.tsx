import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { getCompanyPageBySlug } from "@/lib/queries/company";
import { db } from "@/lib/db/db";
import { ContactPageView } from "@/components/public/contact-page-view";

import { resolvePageMetadata } from "@/lib/seo/metadata";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return resolvePageMetadata("/contact", profile?.id, {
    title: `Contact ${name} | Helplines, Campus Branches & Inquiries`,
    description: `Contact ${name} for course, admission, department helplines, and support enquiries.`,
  });
}

export default async function ContactPage() {
  const host = await getHost();
  const profile = await getCurrentPublicInstitutionProfile(host);
  const companyPage = await getCompanyPageBySlug(db, "contact-us");

  let programs: any[] = [];
  if (profile?.id) {
    try {
      const res = await db.query(
        `
        SELECT id, name AS title, COALESCE(description, '') AS about
        FROM institution_programs
        WHERE institution_id = $1
          AND is_active = TRUE
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY id ASC
        LIMIT 50
        `,
        [profile.id]
      );
      programs = res.rows;
    } catch {
      programs = [];
    }
  }

  return (
    <ContactPageView
      initialInstitutionInfo={profile}
      initialCompanyPage={companyPage}
      initialPrograms={programs}
    />
  );
}
