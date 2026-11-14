"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Button } from "@/components/ui/button";
import { Store, ExternalLink } from "lucide-react";

export function AdminStorefrontHeaderButton() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("platform_admin") ||
    user?.role_codes?.includes("super_admin") ||
    user?.is_super_admin ||
    pathname?.startsWith("/platformadmin")
  );

  if (!user || isPlatformAdmin) return null;

  const storefrontHref = activeInstitution?.id
    ? `/storefront?institutionId=${activeInstitution.id}`
    : "/storefront";

  return (
    <>
      <div className="w-px h-5 bg-border/60" />
      <Button
        size="sm"
        variant="outline"
        asChild
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer shadow-2xs"
        title="Open Live Public Store Front"
      >
        <a href={storefrontHref} target="_blank" rel="noopener noreferrer">
          <Store className="size-3.5" />
          <span>Store Front</span>
          <ExternalLink className="size-3 opacity-60" />
        </a>
      </Button>
    </>
  );
}
