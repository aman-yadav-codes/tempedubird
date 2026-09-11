"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const PlatformAdminLanding = dynamic(
  () => import("@/components/home/platform-admin-landing").then((mod) => mod.PlatformAdminLanding),
  {
    loading: () => <div className="min-h-screen bg-background animate-pulse" />,
  }
);

const InstitutionalAdminLanding = dynamic(
  () => import("@/components/home/institutional-admin-landing").then((mod) => mod.InstitutionalAdminLanding),
  {
    loading: () => <div className="min-h-screen bg-background animate-pulse" />,
  }
);

type HomeLandingContainerProps = {
  initialIsInstitutionEdition?: boolean;
};

export function HomeLandingContainer({
  initialIsInstitutionEdition,
}: HomeLandingContainerProps = {}) {
  const searchParams = useSearchParams();

  // Only show institution landing if explicitly requested via URL parameter
  const paramInstId =
    searchParams?.get("institution_id") ||
    searchParams?.get("institute_id") ||
    searchParams?.get("inst_id") ||
    searchParams?.get("institution") ||
    searchParams?.get("institutionId") ||
    searchParams?.get("inst");

  const urlInstId = paramInstId && !isNaN(Number(paramInstId)) && Number(paramInstId) > 0
    ? Number(paramInstId)
    : null;

  const envDefaultInstId = process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID
    ? Number(process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID)
    : null;

  const isInstitutionEdition = Boolean(
    initialIsInstitutionEdition ||
    (urlInstId && urlInstId > 0) ||
    (envDefaultInstId && envDefaultInstId > 0)
  );

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1">
        {isInstitutionEdition ? (
          <InstitutionalAdminLanding />
        ) : (
          <PlatformAdminLanding />
        )}
      </div>
    </div>
  );
}

