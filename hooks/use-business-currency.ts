"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store";
import { getCatalogCountryMeta, type CatalogCountryMeta } from "@/lib/config/country-config";

export function useBusinessCurrency(explicitCountryCode?: string | null) {
  const { user, accessToken } = useAuthStore();
  const [detectedCountry, setDetectedCountry] = useState<string>("IN");
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  useEffect(() => {
    // 1. If explicitCountryCode passed, use it immediately
    if (explicitCountryCode) {
      setDetectedCountry(explicitCountryCode.toUpperCase());
      setProfileLoaded(true);
      return;
    }

    // 2. Check if APP_MODE=business environment variable specifies a default country
    const envCountry = (process.env.NEXT_PUBLIC_COUNTRY_CODE || "").trim().toUpperCase();
    if (envCountry) {
      setDetectedCountry(envCountry);
    }

    // 3. Fetch active business / professional profile to detect country_code
    let isCancelled = false;

    async function fetchProfileCountry() {
      try {
        // Try roles-profiles endpoint first
        const res = await fetch("/api/admin/user/roles-profiles", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          const bpCountry = json?.data?.businessProfile?.country_code;
          const ppCountry = json?.data?.professionalProfile?.country_code;
          const resolved = bpCountry || ppCountry;
          if (resolved && !isCancelled) {
            setDetectedCountry(resolved.toUpperCase());
            setProfileLoaded(true);
            return;
          }
        }

        // Secondary fallback: company info
        const cRes = await fetch("/api/admin/company/info", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (cRes.ok) {
          const cJson = await cRes.json();
          const cCode = cJson?.data?.country_code || cJson?.data?.country;
          if (cCode && !isCancelled) {
            setDetectedCountry(cCode.toUpperCase());
            setProfileLoaded(true);
            return;
          }
        }
      } catch (err) {
        // Ignore network / parse errors and keep fallback
      } finally {
        if (!isCancelled) setProfileLoaded(true);
      }
    }

    fetchProfileCountry();

    return () => {
      isCancelled = true;
    };
  }, [explicitCountryCode, accessToken]);

  const meta: CatalogCountryMeta = useMemo(() => {
    return getCatalogCountryMeta(detectedCountry);
  }, [detectedCountry]);

  const formatPrice = useMemo(() => {
    return (val: number | string | null | undefined, customCurrency?: string) => {
      const num = Number(val);
      if (isNaN(num)) return `${meta.currencySymbol}0`;

      const symbol =
        customCurrency === "USD" ? "$" :
        customCurrency === "INR" ? "₹" :
        customCurrency === "ZAR" ? "R" :
        customCurrency === "GBP" ? "£" :
        customCurrency === "EUR" ? "€" :
        customCurrency === "AED" ? "AED " :
        meta.currencySymbol;

      const locale =
        meta.code === "IN" ? "en-IN" :
        meta.code === "US" ? "en-US" :
        meta.code === "ZA" ? "en-ZA" :
        meta.code === "GB" ? "en-GB" : "en-US";

      return `${symbol}${num.toLocaleString(locale)}`;
    };
  }, [meta]);

  return {
    countryCode: meta.code,
    countryName: meta.name,
    currencyCode: meta.currencyCode,
    currencySymbol: meta.currencySymbol,
    currencyLabel: `${meta.currencyCode} (${meta.currencySymbol})`,
    formatPrice,
    isLoaded: profileLoaded,
    countryMeta: meta,
  };
}
