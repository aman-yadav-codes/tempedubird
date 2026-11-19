"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Button } from "@/components/ui/button";
import { Store, ExternalLink } from "lucide-react";

export function AdminStorefrontHeaderButton() {
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
    </>
  );
}
