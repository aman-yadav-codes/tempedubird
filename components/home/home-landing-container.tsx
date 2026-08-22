"use client";

import { useSearchParams } from "next/navigation";
import { PlatformAdminLanding } from "@/components/home/platform-admin-landing";
import { InstitutionalAdminLanding } from "@/components/home/institutional-admin-landing";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export function HomeLandingContainer() {
  const searchParams = useSearchParams();
  const { activeInstitutionId } = useActiveInstitution();

  // 1. Check if an institution ID is explicitly configured in .env.local
  const envInstIdRaw = process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || process.env.DEFAULT_INSTITUTION_ID;
  const envInstId = envInstIdRaw && !isNaN(Number(envInstIdRaw)) && Number(envInstIdRaw) > 0
    ? Number(envInstIdRaw)
    : null;

  // 2. Or if explicitly passed via URL search parameters
  const paramInstId = searchParams?.get("institution_id") || searchParams?.get("institute_id") || searchParams?.get("inst_id") || searchParams?.get("institution");
  const urlInstId = paramInstId && !isNaN(Number(paramInstId)) && Number(paramInstId) > 0
    ? Number(paramInstId)
    : null;

  const effectiveInstitutionId = urlInstId || envInstId;
  const isInstitutionEdition = Boolean(effectiveInstitutionId && effectiveInstitutionId > 0);

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

