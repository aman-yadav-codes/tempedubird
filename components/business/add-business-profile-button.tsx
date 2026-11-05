"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Briefcase } from "lucide-react";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { CreateBusinessProfileDialog } from "./create-business-profile-dialog";

export function AddBusinessProfileButton() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const { activeInstitution, institutions } = useActiveInstitution();

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("platform_admin") ||
    user?.role_codes?.includes("super_admin") ||
    user?.is_super_admin
  );

  const isInstitutionAdmin = Boolean(
    user?.role_codes?.includes("institution_admin") ||
    (user as any)?.role === "institution_admin" ||
    (user as any)?.primary_role === "institution_admin"
  );

  // Available for institution admins and platform admins
  if (!isInstitutionAdmin && !isPlatformAdmin) {
    return null;
  }

  const hasNoInstitution = !activeInstitution && institutions.length === 0;

  return (
    <>
      <Button
        type="button"
        variant={hasNoInstitution ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
        className={`h-8 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition-all ${
          hasNoInstitution
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
