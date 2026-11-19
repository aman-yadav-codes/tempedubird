import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { HomeLandingContainer } from "@/components/home/home-landing-container";
import { PlatformAdminHome } from "@/components/platform-admin/platform-admin-home";
import { ConfigurationErrorScreen } from "@/components/configuration-error-screen";
import { getFrontendConfig } from "@/lib/config/frontend-config";
import { getInstitutionTenantByHost } from "@/lib/tenancy/institution-domain";
import { db } from "@/lib/db/db";
import { resolvePageMetadata } from "@/lib/seo/metadata";
import { fetchBusinessFullData } from "@/app/(public)/business/[id]/page";
import { PublicBusinessProfileClient } from "@/components/profile/public-business-profile-client";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata(): Promise<Metadata> {
  const config = getFrontendConfig();
  if (config.mode === "platform_admin") {
    return {
      title: "EduBird Platform — Platform Management & Operations",
      description: "Centralized administration and platform governance for multi-institution infrastructure.",
    };
  }

  const host = await getHost();
  let tenant = null;
  try {
    tenant = await getInstitutionTenantByHost(db, host);
  } catch {
    tenant = null;
  }
  return resolvePageMetadata("/", tenant?.institution_id ?? config.institutionId ?? undefined);
}

export default async function HomePage() {
  const config = getFrontendConfig();

  // 1. Invalid configuration
  if (!config.isValid) {
    return <ConfigurationErrorScreen config={config} />;
  }

  // 2. Scenario B: Platform Admin Mode
  if (config.mode === "platform_admin") {
    return <PlatformAdminHome />;
  }

  // 3. Scenario C: Business Mode (Home Page)
  if (config.mode === "business" && (config.businessId || config.institutionId)) {
    let targetBizId = config.businessId || config.institutionId;
    if (!targetBizId || targetBizId === 1) {
      try {
        const bpRes = await db.query(
          `SELECT id, institution_profile_id FROM business_profiles WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY id ASC LIMIT 1`
        );
        if (bpRes.rows.length > 0) {
          targetBizId = bpRes.rows[0].id;
        }
      } catch (err) {
        console.warn("[HomePage] Failed to resolve targetBizId from business_profiles:", err);
      }
    }
    const data = await fetchBusinessFullData(String(targetBizId));
    const business = data?.business || {
      id: Number(targetBizId),
      name: "Maa Sharda Institute PVT LTD",
      about: "Maa sharda institute PVT LTD well known, coaching institute running successfully since last 6 years in Pandeypur varanasi. We believe in providing all deserving students in Pandeypur and around varanasi with the best curriculum and pedagogy along with the highest quality of education in coaching the students for 11 and 12(science), 8-10 (state and CBSE) and entrance Exam(NEET/JEE) police Bharti, Railway bharti etc..",
      mission: "Maa sharda institute PVT LTD brings out of the latent strengths of every student so that they feel motivated and applauded for their strengths and explore the greater depth of their potential.",
      vision: "To be recognized as a premier educational institute delivering transformative coaching, character development, and academic excellence across Varanasi.",
      goal: "Quality Education: Provide top-grade pedagogy and personal mentorship.\nExam Readiness: Excel in Board exams, JEE, NEET, Police & Railway recruitments.\nStudent Growth: Foster teamwork, analytical thinking, and ethical character.",
      owner_name: "Director & Academic Head",
      owner_designation: "Founder & Leadership",
      phone: "+91 9876543210",
      is_verified: true,
      category_name: "Education & Coaching Institute",
    };

    return (
      <PublicBusinessProfileClient
        business={business}
        products={data?.products || []}
        services={data?.services || []}
        professionals={data?.professionals || []}
        reviews={data?.reviews || []}
        courses={data?.courses || []}
        jobs={data?.jobs || []}
        packages={data?.packages || []}
        isHomePage={true}
      />
    );
  }

  // 4. Scenario A: Institution Mode
  const host = await getHost();
  let tenant = null;
  try {
    tenant = await getInstitutionTenantByHost(db, host);
  } catch {
    tenant = null;
  }
  const isInstitutionMode = Boolean(
    tenant?.institution_id ||
    (config.institutionId && config.institutionId > 0)
  );

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background animate-pulse" />
      }
    >
      <HomeLandingContainer
        initialIsInstitutionEdition={isInstitutionMode}
        configuredInstitutionId={config.institutionId}
      />
    </Suspense>
  );
}
