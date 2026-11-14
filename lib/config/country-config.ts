/**
 * Country-Based Platform Configuration
 * Initially supporting India (IN) and United States (US),
 * extensible to any new countries via database or config.
 */

export type CountryCode = "IN" | "US" | string;

export interface CountryConfig {
  countryName: string;
  countryCode: string;
  currencyCode: "INR" | "USD" | string;
  currencySymbol: "₹" | "$" | string;
  phonePrefix: string;
  phoneRegex: string;
  postalCodeLabel: "PIN code" | "ZIP code" | string;
  postalCodeRegex: string;
  addressStructure: string[];
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultTimezone: string;
  supportedTimezones: string[];
  seoMetadata: {
    title: string;
    description: string;
    keywords: string;
  };
  isActive: boolean;
}

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  IN: {
    countryName: "India",
    countryCode: "IN",
    currencyCode: "INR",
    currencySymbol: "₹",
    phonePrefix: "+91",
    phoneRegex: "^(\\+91[\\-\\s]?)?[6789]\\d{9}$",
    postalCodeLabel: "PIN code",
    postalCodeRegex: "^[1-9][0-9]{5}$",
    addressStructure: ["locality", "city", "district", "state", "postal_code"],
    defaultLanguage: "en-IN",
    supportedLanguages: ["en", "hi", "bn", "te", "mr", "ta", "gu", "kn"],
    defaultTimezone: "Asia/Kolkata",
    supportedTimezones: ["Asia/Kolkata"],
    seoMetadata: {
      title: "Explore Local Businesses & Certified Professionals in India",
      description: "Discover verified businesses, licensed professionals, suggested prices in INR, and real customer reviews across Indian cities.",
      keywords: "India business directory, Indian professionals, local services INR, verified businesses India",
    },
    isActive: true,
  },
  US: {
    countryName: "United States",
    countryCode: "US",
    currencyCode: "USD",
    currencySymbol: "$",
    phonePrefix: "+1",
    phoneRegex: "^(\\+1[\\-\\s]?)?\\(?([2-9][0-8][0-9])\\)?[\\-\\s]?([2-9][0-9]{2})[\\-\\s]?([0-9]{4})$",
    postalCodeLabel: "ZIP code",
    postalCodeRegex: "^\\d{5}(-\\d{4})?$",
    addressStructure: ["locality", "city", "county", "state", "postal_code"],
    defaultLanguage: "en-US",
    supportedLanguages: ["en", "es"],
    defaultTimezone: "America/New_York",
    supportedTimezones: [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
    ],
    seoMetadata: {
      title: "Explore Local Businesses & Licensed Professionals in the United States",
      description: "Discover top-rated local companies, certified professionals, suggested prices in USD, and verified client reviews across US cities.",
      keywords: "USA local directory, American professionals, business services USD, verified US businesses",
    },
    isActive: true,
  },
};

export interface CatalogCountryMeta {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
}

export const CATALOG_AVAILABLE_COUNTRIES: CatalogCountryMeta[] = [
  { code: "IN", name: "India", flag: "🇮🇳", currencyCode: "INR", currencySymbol: "₹" },
  { code: "US", name: "United States", flag: "🇺🇸", currencyCode: "USD", currencySymbol: "$" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currencyCode: "GBP", currencySymbol: "£" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currencyCode: "CAD", currencySymbol: "$" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currencyCode: "AUD", currencySymbol: "$" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currencyCode: "AED", currencySymbol: "د.إ" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currencyCode: "SGD", currencySymbol: "$" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currencyCode: "EUR", currencySymbol: "€" },
  { code: "FR", name: "France", flag: "🇫🇷", currencyCode: "EUR", currencySymbol: "€" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currencyCode: "SAR", currencySymbol: "﷼" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", currencyCode: "NZD", currencySymbol: "$" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currencyCode: "ZAR", currencySymbol: "R" },
];

export function getCatalogCountryMeta(code: string): CatalogCountryMeta {
  const normalized = (code || "IN").trim().toUpperCase();
  const found = CATALOG_AVAILABLE_COUNTRIES.find((c) => c.code === normalized);
  if (found) return found;
  return {
    code: normalized,
    name: normalized,
    flag: "🌐",
    currencyCode: "USD",
    currencySymbol: "$",
  };
}

/**
 * Get country configuration by code (defaults to India if not specified or unknown)
 */
export function getCountryConfig(code?: string | null): CountryConfig {
  const normalized = (code || "IN").trim().toUpperCase();
  return (
    COUNTRY_CONFIGS[normalized] || {
      countryName: normalized,
      countryCode: normalized,
      currencyCode: "USD",
      currencySymbol: "$",
      phonePrefix: "+1",
      phoneRegex: "^[+0-9 -]{7,20}$",
      postalCodeLabel: "Postal Code",
      postalCodeRegex: "^[0-9A-Za-z -]{3,10}$",
      addressStructure: ["address", "locality", "city", "state", "postal_code"],
      defaultLanguage: "en",
      supportedLanguages: ["en"],
      defaultTimezone: "UTC",
      supportedTimezones: ["UTC"],
      seoMetadata: {
        title: `Explore Local Businesses in ${normalized}`,
        description: `Find top local businesses and professionals in ${normalized}.`,
        keywords: "local business directory, professionals",
      },
      isActive: true,
    }
  );
}

/**
 * Country-aware currency display formatter
 */
export function formatCountryCurrency(
  amount: number | string,
  countryCode: string = "IN"
): string {
  const num = Number(amount) || 0;
  const config = getCountryConfig(countryCode);

  if (config.countryCode === "IN") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: config.currencyCode || "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Country-aware phone validation
 */
export function validateCountryPhone(
  phone: string,
  countryCode: string = "IN"
): { valid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, error: "Phone number is required" };
  }

  const cleanPhone = phone.trim();
  const config = getCountryConfig(countryCode);

  try {
    const regex = new RegExp(config.phoneRegex);
    if (!regex.test(cleanPhone)) {
      if (config.countryCode === "IN") {
        return {
          valid: false,
          error: "Invalid Indian phone number. Expected 10 digits starting with 6-9 (e.g. +91 9876543210 or 9876543210).",
        };
      } else if (config.countryCode === "US") {
        return {
          valid: false,
          error: "Invalid US phone number. Expected 10 digits with valid area code (e.g. +1 (555) 123-4567 or 555-123-4567).",
        };
      }
      return { valid: false, error: "Invalid phone number format." };
    }
  } catch {
    // Regex parsing fallback
  }

  return { valid: true };
}

/**
 * Country-aware postal code validation (PIN code for India, ZIP code for USA)
 */
export function validateCountryPostalCode(
  postalCode: string,
  countryCode: string = "IN"
): { valid: boolean; error?: string } {
  if (!postalCode || !postalCode.trim()) {
    return { valid: false, error: "Postal code is required" };
  }

  const cleanCode = postalCode.trim();
  const config = getCountryConfig(countryCode);

  try {
    const regex = new RegExp(config.postalCodeRegex);
    if (!regex.test(cleanCode)) {
      if (config.countryCode === "IN") {
        return {
          valid: false,
          error: "Invalid PIN code. Expected 6 digits without starting with 0 (e.g. 560001, 110001).",
        };
      } else if (config.countryCode === "US") {
        return {
          valid: false,
          error: "Invalid ZIP code. Expected 5 digits or 5+4 format (e.g. 90210 or 10001-1234).",
        };
      }
      return { valid: false, error: "Invalid postal code format." };
    }
  } catch {
    // Regex fallback
  }

  return { valid: true };
}

/**
 * Returns country-specific suggested product price
 */
export function getSuggestedProductPrice(
  product: { suggested_price_inr?: number | string | null; suggested_price_usd?: number | string | null },
  countryCode: string = "IN"
): { price: number; currency: string; formatted: string } {
  const code = (countryCode || "IN").toUpperCase();
  if (code === "IN") {
    const price = Number(product.suggested_price_inr || 0);
    return {
      price,
      currency: "INR",
      formatted: formatCountryCurrency(price, "IN"),
    };
  } else {
    const price = Number(product.suggested_price_usd || 0);
    return {
      price,
      currency: "USD",
      formatted: formatCountryCurrency(price, "US"),
    };
  }
}

/**
 * Returns country-specific suggested service price
 */
export function getSuggestedServicePrice(
  service: { suggested_price_inr?: number | string | null; suggested_price_usd?: number | string | null },
  countryCode: string = "IN"
): { price: number; currency: string; formatted: string } {
  const code = (countryCode || "IN").toUpperCase();
  if (code === "IN") {
    const price = Number(service.suggested_price_inr || 0);
    return {
      price,
      currency: "INR",
      formatted: formatCountryCurrency(price, "IN"),
    };
  } else {
    const price = Number(service.suggested_price_usd || 0);
    return {
      price,
      currency: "USD",
      formatted: formatCountryCurrency(price, "US"),
    };
  }
}

