"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CATALOG_AVAILABLE_COUNTRIES,
  getCatalogCountryMeta,
  type CatalogCountryMeta,
} from "@/lib/config/country-config";

export const STORAGE_KEY_COUNTRY = "edubird_user_country";

export function useUserCountry() {
  const [countryCode, setCountryCodeState] = useState<string>("IN");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COUNTRY);
      if (saved) {
        setCountryCodeState(saved.toUpperCase());
      }
    } catch {
      // Ignore localStorage errors
    }

    const handleSync = (e: any) => {
      if (e?.detail?.countryCode) {
        setCountryCodeState(e.detail.countryCode.toUpperCase());
      }
    };

    window.addEventListener("edubird-country-change", handleSync);
    return () => {
      window.removeEventListener("edubird-country-change", handleSync);
    };
  }, []);

  const setCountry = useCallback((newCode: string) => {
    const normalized = (newCode || "IN").trim().toUpperCase();
    setCountryCodeState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY_COUNTRY, normalized);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("edubird-country-change", {
            detail: { countryCode: normalized },
          })
        );
      }
    } catch {}
  }, []);

  const country: CatalogCountryMeta = getCatalogCountryMeta(countryCode);

  return {
    countryCode,
    country,
    setCountry,
    availableCountries: CATALOG_AVAILABLE_COUNTRIES,
    mounted,
  };
}

export { CATALOG_AVAILABLE_COUNTRIES, getCatalogCountryMeta, type CatalogCountryMeta };
