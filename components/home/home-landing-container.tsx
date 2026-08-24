"use client";

import { useSearchParams } from "next/navigation";
import { PlatformAdminLanding } from "@/components/home/platform-admin-landing";
import { InstitutionalAdminLanding } from "@/components/home/institutional-admin-landing";
import { useActiveInstitution } from "@/hooks/use-active-institution";

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

