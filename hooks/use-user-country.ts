"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CATALOG_AVAILABLE_COUNTRIES,
  getCatalogCountryMeta,
  type CatalogCountryMeta,
} from "@/lib/config/country-config";
import { resolveCountryFromLocation } from "@/lib/utils/geo-location";

export const STORAGE_KEY_COUNTRY = "edubird_user_country";

export function useUserCountry() {
  const [countryCode, setCountryCodeState] = useState<string>("IN");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLoc = localStorage.getItem("edubird_user_location");
      const savedCountry = localStorage.getItem(STORAGE_KEY_COUNTRY);

      // Prioritize country resolved from user location if active location is present
      const locCountry = savedLoc && savedLoc !== "All Locations" ? resolveCountryFromLocation(savedLoc) : null;

      if (locCountry) {
        setCountryCodeState(locCountry.toUpperCase());
        localStorage.setItem(STORAGE_KEY_COUNTRY, locCountry.toUpperCase());
      } else if (savedCountry) {
        setCountryCodeState(savedCountry.toUpperCase());
      }
    } catch {
      // Ignore localStorage errors
    }

    const handleCountrySync = (e: any) => {
      if (e?.detail?.countryCode) {
        setCountryCodeState(e.detail.countryCode.toUpperCase());
      }
    };

    const handleLocationSync = (e: any) => {
      const loc = e?.detail?.location;
      const explicitCode = e?.detail?.countryCode;
      const resolved = explicitCode || (loc ? resolveCountryFromLocation(loc) : null);
      if (resolved) {
        const normalized = resolved.toUpperCase();
        setCountryCodeState(normalized);
        try {
          localStorage.setItem(STORAGE_KEY_COUNTRY, normalized);
        } catch {}
      }
    };

    window.addEventListener("edubird-country-change", handleCountrySync);
    window.addEventListener("edubird-location-change", handleLocationSync);

    return () => {
      window.removeEventListener("edubird-country-change", handleCountrySync);
      window.removeEventListener("edubird-location-change", handleLocationSync);
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
