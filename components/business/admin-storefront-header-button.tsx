"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Button } from "@/components/ui/button";
import { Store, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminStorefrontHeaderButtonProps {
  className?: string;
  showDivider?: boolean;
  variant?: "header" | "sidebar";
}

export function AdminStorefrontHeaderButton({
  className,
  showDivider = true,
  variant = "header",
}: AdminStorefrontHeaderButtonProps = {}) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const instId = activeInstitution?.id;

  const [directUrl, setDirectUrl] = useState<string>(() => {
    if (activeInstitution?.storefrontUrl) return activeInstitution.storefrontUrl;
    if (typeof window !== "undefined" && instId) {
      try {
        const cached = localStorage.getItem(`edubird.storefrontUrl.${instId}`);
        if (cached) return cached;
      } catch {}
    }
    return "";
  });

  // Keep in sync with activeInstitution
  useEffect(() => {
    if (activeInstitution?.storefrontUrl) {
      setDirectUrl(activeInstitution.storefrontUrl);
      if (instId) {
        try {
          localStorage.setItem(`edubird.storefrontUrl.${instId}`, activeInstitution.storefrontUrl);
        } catch {}
      }
      return;
    }

    if (!instId) return;

    let cancelled = false;
    fetch(`/api/public/storefront/resolve?institutionId=${instId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.url) {
          setDirectUrl(data.url);
          try {
            localStorage.setItem(`edubird.storefrontUrl.${instId}`, data.url);
          } catch {}
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeInstitution?.storefrontUrl, instId]);

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("platform_admin") ||
    user?.role_codes?.includes("super_admin") ||
    user?.is_super_admin ||
    pathname?.startsWith("/platformadmin")
  );

  if (!user || isPlatformAdmin) return null;

  // Rule: Do not show Store Front button if user has not added any business profile yet
  const hasBusiness = Boolean(
    activeInstitution?.id ||
    user?.has_business_profile ||
    user?.has_professional_profile ||
    (Array.isArray(user?.memberships) && user.memberships.length > 0)
  );

  if (!hasBusiness) return null;

  const effectiveHref = directUrl || (activeInstitution?.slug ? `/institutes/${activeInstitution.slug}` : "");

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (effectiveHref) {
      // Direct destination link already present, let standard anchor target="_blank" handle it
      return;
    }

    e.preventDefault();
    try {
      const targetQuery = instId ? `?institutionId=${instId}` : "";
      const res = await fetch(`/api/public/storefront/resolve${targetQuery}`);
      const data = await res.json();
      const dest = data?.url || "/explore";
      if (instId) {
        try {
          localStorage.setItem(`edubird.storefrontUrl.${instId}`, dest);
        } catch {}
      }
      setDirectUrl(dest);
      window.open(dest, "_blank");
    } catch {
      window.open("/explore", "_blank");
    }
  };

  if (variant === "sidebar") {
    return (
      <Button
        size="sm"
        variant="outline"
        asChild
        className={cn(
          "w-full justify-between h-9 px-3 text-xs font-semibold border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer rounded-xl shadow-2xs",
          className
        )}
        title="Open Live Public Store Front"
      >
        <a
          href={effectiveHref || "#"}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full"
        >
          <span className="flex items-center gap-2">
            <Store className="size-4 text-primary shrink-0" />
            <span className="font-semibold">Store Front</span>
          </span>
          <ExternalLink className="size-3.5 opacity-70 shrink-0" />
        </a>
      </Button>
    );
  }

  return (
    <div className={cn("hidden md:flex items-center", className)}>
      {showDivider && <div className="w-px h-5 bg-border/60 mr-3" />}
      <Button
        size="sm"
        variant="outline"
        asChild
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer shadow-2xs"
        title="Open Live Public Store Front"
      >
        <a
          href={effectiveHref || "#"}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Store className="size-3.5" />
          <span>Store Front</span>
          <ExternalLink className="size-3 opacity-60" />
        </a>
      </Button>
    </div>
  );
}
