/**
 * Centralized Frontend Mode and Environment Configuration Resolver
 *
 * Controls whether the application renders:
 * 1. Business Frontend (APP_MODE=business, requires BUSINESS_ID / INSTITUTION_ID)
 * 2. Institution Frontend (APP_MODE=institution, requires INSTITUTION_ID)
 * 3. Platform Admin Frontend (APP_MODE=platform_admin; business_id and institution_id must be null)
 */

export type FrontendMode = "business" | "institution" | "platform_admin" | "all";

export type FrontendConfigValidation = {
  isValid: boolean;
  mode: FrontendMode | "unknown";
  rawMode: string;
  businessId: number | null;
  rawBusinessId: string;
  institutionId: number | null;
  rawInstitutionId: string;
  error?: string;
  details?: string;
  help?: string;
};

/**
 * Returns raw APP_MODE string from environment variables.
 * Checks APP_MODE (server) and NEXT_PUBLIC_APP_MODE (client),
 * falling back to legacy APP_TYPE if present.
 */
export function getRawAppMode(): string {
  const mode =
    process.env.APP_MODE ??
    process.env.NEXT_PUBLIC_APP_MODE ??
    process.env.APP_TYPE ??
    process.env.NEXT_PUBLIC_APP_TYPE ??
    "";
  return String(mode).trim();
}

/**
 * Returns raw BUSINESS_ID string from environment variables.
 * Checks BUSINESS_ID, NEXT_PUBLIC_BUSINESS_ID, INSTITUTION_ID, NEXT_PUBLIC_INSTITUTION_ID.
 */
export function getRawBusinessId(): string {
  const id =
    process.env.BUSINESS_ID ??
    process.env.NEXT_PUBLIC_BUSINESS_ID ??
    process.env.INSTITUTION_ID ??
    process.env.NEXT_PUBLIC_INSTITUTION_ID ??
    "";
  return String(id).trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Returns raw INSTITUTION_ID string from environment variables.
 * Checks INSTITUTION_ID, NEXT_PUBLIC_INSTITUTION_ID, BUSINESS_ID, NEXT_PUBLIC_BUSINESS_ID, and legacy DEFAULT_INSTITUTION_ID.
 */
export function getRawInstitutionId(): string {
  const id =
    process.env.INSTITUTION_ID ??
    process.env.NEXT_PUBLIC_INSTITUTION_ID ??
    process.env.BUSINESS_ID ??
    process.env.NEXT_PUBLIC_BUSINESS_ID ??
    process.env.DEFAULT_INSTITUTION_ID ??
    process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ??
    "";
  return String(id).trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Validates the environment configuration and returns structured validation status.
 */
export function getFrontendConfig(): FrontendConfigValidation {
  const rawMode = getRawAppMode();
  const rawBusinessId = getRawBusinessId();
  const rawInstitutionId = getRawInstitutionId();
  const normalizedMode = rawMode.toLowerCase();

  // Scenario 1: Platform Admin Mode
  // For platform admin, APP_MODE will be platform_admin and business_id / institution_id should be null
  if (normalizedMode === "platform_admin" || normalizedMode === "platform") {
    return {
      isValid: true,
      mode: "platform_admin",
      rawMode,
      businessId: null,
      rawBusinessId,
      institutionId: null,
      rawInstitutionId,
    };
  }

  // Scenario 2: Business Mode
  // For business, APP_MODE = business, and in env institution_id must be business_id
  if (normalizedMode === "business") {
    const rawBiz = rawBusinessId || rawInstitutionId;
    if (!rawBiz) {
      return {
        isValid: false,
        mode: "business",
        rawMode,
        businessId: null,
        rawBusinessId: rawBiz,
        institutionId: null,
        rawInstitutionId,
        error: "Missing BUSINESS_ID in Business Mode",
        details:
          "APP_MODE is set to 'business', but no BUSINESS_ID or INSTITUTION_ID was provided. An active, positive numeric business ID is required.",
        help: "Add 'BUSINESS_ID=4' (and 'INSTITUTION_ID=4') to your .env file.",
      };
    }

    const parsedId = Number(rawBiz);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return {
        isValid: false,
        mode: "business",
        rawMode,
        businessId: null,
        rawBusinessId: rawBiz,
        institutionId: null,
        rawInstitutionId,
        error: "Invalid BUSINESS_ID in Business Mode",
        details: `Expected a positive integer for BUSINESS_ID, but received '${rawBiz}'.`,
        help: "Update 'BUSINESS_ID' in your .env file to a valid positive integer (e.g. BUSINESS_ID=4).",
      };
    }

    return {
      isValid: true,
      mode: "business",
      rawMode,
      businessId: parsedId,
      rawBusinessId: rawBiz,
      institutionId: parsedId,
      rawInstitutionId: rawBiz,
    };
  }

  // Scenario 3: Institution Mode
  if (normalizedMode === "institution") {
    if (!rawInstitutionId) {
      return {
        isValid: false,
        mode: "institution",
        rawMode,
        businessId: null,
        rawBusinessId,
        institutionId: null,
        rawInstitutionId,
        error: "Missing INSTITUTION_ID in Institution Mode",
        details:
          "APP_MODE is set to 'institution', but no INSTITUTION_ID was provided. An active, positive numeric institution ID is required to load institution branding, content, and data.",
        help: "Add 'INSTITUTION_ID=125' (replace 125 with your desired institution ID) to your .env file.",
      };
    }

    const parsedId = Number(rawInstitutionId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return {
        isValid: false,
        mode: "institution",
        rawMode,
        businessId: null,
        rawBusinessId,
        institutionId: null,
        rawInstitutionId,
        error: "Invalid INSTITUTION_ID in Institution Mode",
        details: `Expected a positive integer for INSTITUTION_ID, but received '${rawInstitutionId}'.`,
        help: "Update 'INSTITUTION_ID' in your .env file to a valid positive integer (e.g. INSTITUTION_ID=125).",
      };
    }

    return {
      isValid: true,
      mode: "institution",
      rawMode,
      businessId: parsedId,
      rawBusinessId: rawInstitutionId,
      institutionId: parsedId,
      rawInstitutionId,
    };
  }

  // Legacy fallback: if APP_TYPE=all or rawMode is "all", maintain backward compatibility
  if (normalizedMode === "all" || normalizedMode === "hybrid") {
    const parsedId = Number(rawInstitutionId || rawBusinessId);
    const validId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
    return {
      isValid: true,
      mode: "all",
      rawMode,
      businessId: validId,
      rawBusinessId,
      institutionId: validId,
      rawInstitutionId,
    };
  }

  // If APP_MODE is unset or empty
  if (!rawMode) {
    const parsedId = Number(rawInstitutionId || rawBusinessId);
    if (Number.isInteger(parsedId) && parsedId > 0) {
      return {
        isValid: true,
        mode: "institution",
        rawMode: "institution (default)",
        businessId: parsedId,
        rawBusinessId,
        institutionId: parsedId,
        rawInstitutionId,
      };
    }

    return {
      isValid: false,
      mode: "unknown",
      rawMode,
      businessId: null,
      rawBusinessId,
      institutionId: null,
      rawInstitutionId,
      error: "Missing APP_MODE Configuration",
      details:
        "No APP_MODE was configured in the environment. The application requires an explicit APP_MODE to determine which frontend to load.",
      help: "Set 'APP_MODE=business' (with BUSINESS_ID=4) or 'APP_MODE=platform_admin' in your .env file.",
    };
  }

  // Unknown mode
  return {
    isValid: false,
    mode: "unknown",
    rawMode,
    businessId: null,
    rawBusinessId,
    institutionId: null,
    rawInstitutionId,
    error: `Unknown APP_MODE: '${rawMode}'`,
    details:
      "The specified APP_MODE is not recognized. The application supports 'business', 'institution', and 'platform_admin'.",
    help: "Set 'APP_MODE=business' or 'APP_MODE=platform_admin' in your .env file.",
  };
}

export function isPlatformAdminMode(): boolean {
  return getFrontendConfig().mode === "platform_admin";
}

export function isBusinessMode(): boolean {
  return getFrontendConfig().mode === "business";
}

export function isInstitutionMode(): boolean {
  const mode = getFrontendConfig().mode;
  return mode === "institution" || mode === "business";
}

export function isStrictInstitutionMode(): boolean {
  return getFrontendConfig().mode === "institution";
}

export function getValidatedBusinessId(): number | null {
  const config = getFrontendConfig();
  return config.isValid ? config.businessId : null;
}

export function getValidatedInstitutionId(): number | null {
  const config = getFrontendConfig();
  return config.isValid ? config.institutionId : null;
}

