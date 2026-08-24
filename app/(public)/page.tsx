import { Suspense } from "react";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { HomeLandingContainer } from "@/components/home/home-landing-container";
import { PlatformAdminLanding } from "@/components/home/platform-admin-landing";
import { getInstitutionTenantByHost } from "@/lib/tenancy/institution-domain";
import { db } from "@/lib/db/db";
import { resolvePageMetadata } from "@/lib/seo/metadata";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata(): Promise<Metadata> {
  const host = await getHost();
  let tenant = null;
  try {
    tenant = await getInstitutionTenantByHost(db, host);
  } catch {
    tenant = null;
  }
  return resolvePageMetadata("/", tenant?.institution_id);
}

export default async function HomePage() {
  const host = await getHost();
  let tenant = null;
  try {
    tenant = await getInstitutionTenantByHost(db, host);
  } catch {
    tenant = null;
  }
  const envDefaultInstId = process.env.DEFAULT_INSTITUTION_ID || process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID;
  const isInstitutionMode = Boolean(
    tenant?.institution_id ||
    (envDefaultInstId && /^\d+$/.test(envDefaultInstId.trim()) && Number(envDefaultInstId.trim()) > 0)
  );

  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <PlatformAdminLanding />
        </div>
      }
    >
      <HomeLandingContainer initialIsInstitutionEdition={isInstitutionMode} />
    </Suspense>
  );
}
