"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isStaffUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { CreateBusinessProfileDialog } from "./create-business-profile-dialog";

export function AddBusinessProfileButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const { activeInstitution, institutions } = useActiveInstitution();
  const [dbProfileCount, setDbProfileCount] = useState<number | null>(null);

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("platform_admin") ||
    user?.role_codes?.includes("super_admin") ||
    user?.is_super_admin ||
    pathname?.startsWith("/platformadmin")
  );

  // Check backend for existing business or professional profile
  useEffect(() => {
    if (!user || isPlatformAdmin) return;
    let isCancelled = false;
    fetch("/api/admin/institutions/create-business", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data?.userProfileCount != null) {
          setDbProfileCount(data.userProfileCount);
        }
      })
      .catch(() => { });
    return () => {
      isCancelled = true;
    };
  }, [user, accessToken, isPlatformAdmin]);

  // Platform Admin CANNOT add business or professional accounts and should never see this button
  if (!user || isPlatformAdmin) {
    return null;
  }

  // Rule 1: Staff members can NOT add new business profile or professional profile
  if (isStaffUser(user)) {
    return null;
  }

  // Rule 2: Only 1 account can add 1 business profile or professional account. After that, disappear this button.
  const hasExistingProfile = Boolean(
    isInstitutionAdminUser(user) ||
    user.has_business_profile ||
    user.has_professional_profile ||
    (user.memberships && user.memberships.length > 0) ||
    (user as any).under_institution_id ||
    (user as any).institution_id ||
    (user as any).active_institution_id ||
    institutions.length > 0 ||
    activeInstitution ||
    (dbProfileCount !== null && dbProfileCount > 0)
  );

  if (hasExistingProfile) {
    return null;
  }

  const hasNoInstitution = !activeInstitution && institutions.length === 0;

  return (
    <>
      <div className="w-px h-5 bg-border/60 hidden sm:block" />
      <Button
        type="button"
        variant={hasNoInstitution ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        className={`h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition-all ${hasNoInstitution
            ? "bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse sm:animate-none"
            : "border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
          }`}
        title="Add Business Profile or Professional Profile"
      >
        <Plus className="size-3.5 shrink-0" />
        <span className="hidden md:inline">
          {hasNoInstitution ? "Add Business Profile" : "Add Business / Professional Profile"}
        </span>
        <span className="md:hidden">Add Business</span>
      </Button>

      <CreateBusinessProfileDialog
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

