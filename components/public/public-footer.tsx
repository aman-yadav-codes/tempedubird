"use client";

import { PlatformAdminFooter } from "@/components/platform-admin/platform-admin-footer";

/**
 * PublicFooter - Unified footer rendering the modern 143Panda responsive footer
 * with App download banner, community stats counter, newsletter subscribe form,
 * 5-column mega navigation, and operational status bar.
 */
export function PublicFooter({
  configuredInstitutionId,
}: {
  configuredInstitutionId?: number | null;
} = {}) {
  return <PlatformAdminFooter />;
}
