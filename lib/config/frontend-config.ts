/**
 * Centralized Frontend Mode and Environment Configuration Resolver
 *
 * Controls whether the application renders:
 * 1. Scenario A: Institution Frontend (requires APP_MODE=institution and a valid positive INSTITUTION_ID)
 * 2. Scenario B: Platform Admin Frontend (requires APP_MODE=platform_admin; no Institution ID required)
 */

export type FrontendMode = "institution" | "platform_admin" | "all";

export type FrontendConfigValidation = {
  isValid: boolean;
  mode: FrontendMode | "unknown";
  rawMode: string;
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
 * Returns raw INSTITUTION_ID string from environment variables.
 * Checks INSTITUTION_ID, NEXT_PUBLIC_INSTITUTION_ID, and legacy DEFAULT_INSTITUTION_ID.
 */
export function getRawInstitutionId(): string {
  const id =
    process.env.INSTITUTION_ID ??
    process.env.NEXT_PUBLIC_INSTITUTION_ID ??
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
  const rawInstitutionId = getRawInstitutionId();
  const normalizedMode = rawMode.toLowerCase();

  // Scenario B: Platform Admin Mode
  if (normalizedMode === "platform_admin" || normalizedMode === "platform") {
    return {
      isValid: true,
      mode: "platform_admin",
      rawMode,
      institutionId: null, // Platform Admin must never require or leak an institution ID
      rawInstitutionId,
    };
  }

  // Scenario A: Institution Mode
  if (normalizedMode === "institution") {
    if (!rawInstitutionId) {
      return {
        isValid: false,
        mode: "institution",
        rawMode,
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
      institutionId: parsedId,
      rawInstitutionId,
    };
  }

  // Legacy fallback: if APP_TYPE=all or rawMode is "all", maintain backward compatibility
  if (normalizedMode === "all" || normalizedMode === "hybrid") {
    const parsedId = Number(rawInstitutionId);
    const validId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
    return {
      isValid: true,
      mode: "all",
      rawMode,
      institutionId: validId,
      rawInstitutionId,
    };
  }

  // If APP_MODE is unset or empty
  if (!rawMode) {
    // If a default institution ID is present, preserve existing default institution experience
    const parsedId = Number(rawInstitutionId);
    if (Number.isInteger(parsedId) && parsedId > 0) {
      return {
        isValid: true,
        mode: "institution",
        rawMode: "institution (default)",
        institutionId: parsedId,
        rawInstitutionId,
      };
    }

    return {
      isValid: false,
      mode: "unknown",
      rawMode,
      institutionId: null,
      rawInstitutionId,
      error: "Missing APP_MODE Configuration",
      details:
        "No APP_MODE was configured in the environment. The application requires an explicit APP_MODE to determine which frontend to load.",
      help: "Set 'APP_MODE=institution' (with INSTITUTION_ID=125) or 'APP_MODE=platform_admin' in your .env file.",
    };
  }

  // Unknown mode
  return {
    isValid: false,
    mode: "unknown",
    rawMode,
    institutionId: null,
    rawInstitutionId,
    error: `Unknown APP_MODE: '${rawMode}'`,
    details:
      "The specified APP_MODE is not recognized. The application supports 'institution' and 'platform_admin'.",
    help: "Set 'APP_MODE=institution' or 'APP_MODE=platform_admin' in your .env file.",
  };
}

export function isPlatformAdminMode(): boolean {
  return getFrontendConfig().mode === "platform_admin";
}

export function isInstitutionMode(): boolean {
  return getFrontendConfig().mode === "institution";
}

export function getValidatedInstitutionId(): number | null {
  const config = getFrontendConfig();
  return config.isValid ? config.institutionId : null;
}
