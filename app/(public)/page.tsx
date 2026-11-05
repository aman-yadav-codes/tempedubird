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

  // 3. Scenario A: Institution Mode
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
