import {
  getFrontendConfig,
  isPlatformAdminMode,
  isInstitutionMode,
  isBusinessMode,
  getValidatedInstitutionId,
  getValidatedBusinessId,
} from "../../lib/config/frontend-config";
import { getConfiguredInstitutionId } from "../../lib/tenancy/institution-domain";
import { getDefaultInstitutionId } from "../../lib/auth/active-institution";
import { isPlatformDeployment, isInstitutionDeployment, isBusinessDeployment } from "../../lib/deployment/app-mode";

// Helper for test assertions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("=== Running Frontend Switching & Configuration Tests ===\n");
  const originalEnv = { ...process.env };

  function setEnv(env: Record<string, string | undefined>) {
    // Clear all related keys first
    delete process.env.APP_MODE;
    delete process.env.NEXT_PUBLIC_APP_MODE;
    delete process.env.APP_TYPE;
    delete process.env.NEXT_PUBLIC_APP_TYPE;
    delete process.env.BUSINESS_ID;
    delete process.env.NEXT_PUBLIC_BUSINESS_ID;
    delete process.env.INSTITUTION_ID;
    delete process.env.NEXT_PUBLIC_INSTITUTION_ID;
    delete process.env.DEFAULT_INSTITUTION_ID;
    delete process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID;

    for (const [key, val] of Object.entries(env)) {
      if (val !== undefined) {
        process.env[key] = val;
      }
    }
  }

  try {
    // Test 1: Scenario A - Business Mode with BUSINESS_ID 4 and INSTITUTION_ID 4
    setEnv({ APP_MODE: "business", BUSINESS_ID: "4", INSTITUTION_ID: "4" });
    const configBiz = getFrontendConfig();
    assert(configBiz.isValid === true, "Business mode should be valid");
    assert(configBiz.mode === "business", "Mode should be 'business'");
    assert(configBiz.businessId === 4, "businessId should be 4");
    assert(configBiz.institutionId === 4, "institutionId should be 4");
    assert(isBusinessMode() === true, "isBusinessMode() should be true");
    assert(isBusinessDeployment() === true, "isBusinessDeployment() should be true");
    assert(isPlatformAdminMode() === false, "isPlatformAdminMode() should be false");
    assert(getConfiguredInstitutionId() === 4, "getConfiguredInstitutionId() should return 4");
    assert(getDefaultInstitutionId() === 4, "getDefaultInstitutionId() should return 4");
    console.log("  ✓ Business Mode: APP_MODE=business + BUSINESS_ID=4 works correctly");

    // Test 2: Institution Mode with ID 125
    setEnv({ APP_MODE: "institution", INSTITUTION_ID: "125" });
    const configA = getFrontendConfig();
    assert(configA.isValid === true, "Scenario A should be valid");
    assert(configA.mode === "institution", "Scenario A mode should be 'institution'");
    assert(configA.institutionId === 125, "Scenario A institutionId should be 125");
    assert(isInstitutionMode() === true, "isInstitutionMode() should be true");
    assert(isPlatformAdminMode() === false, "isPlatformAdminMode() should be false");
    assert(isInstitutionDeployment() === true, "isInstitutionDeployment() should be true");
    assert(isPlatformDeployment() === false, "isPlatformDeployment() should be false");
    assert(getConfiguredInstitutionId() === 125, "getConfiguredInstitutionId() should return 125");
    assert(getDefaultInstitutionId() === 125, "getDefaultInstitutionId() should return 125");
    console.log("  ✓ Scenario A: APP_MODE=institution + INSTITUTION_ID=125 works correctly");

    // Test 3: Platform Admin Mode
    setEnv({ APP_MODE: "platform_admin", BUSINESS_ID: "", INSTITUTION_ID: "" });
    const configB = getFrontendConfig();
    assert(configB.isValid === true, "Scenario B should be valid");
    assert(configB.mode === "platform_admin", "Scenario B mode should be 'platform_admin'");
    assert(configB.businessId === null, "Platform admin businessId must be null");
    assert(configB.institutionId === null, "Platform admin institutionId must be null");
    assert(isPlatformAdminMode() === true, "isPlatformAdminMode() should be true");
    assert(isInstitutionMode() === false, "isInstitutionMode() should be false");
    assert(isPlatformDeployment() === true, "isPlatformDeployment() should be true");
    assert(getConfiguredInstitutionId() === null, "Platform admin must never return a configured institution ID");
    assert(getDefaultInstitutionId() === null, "Platform admin must never return a default institution ID");
    console.log("  ✓ Scenario B: APP_MODE=platform_admin works and sets business_id and institution_id to null");

    // Test 4: Platform Admin Mode ignores any leftover IDs
    setEnv({ APP_MODE: "platform_admin", BUSINESS_ID: "4", INSTITUTION_ID: "999" });
    const configB2 = getFrontendConfig();
    assert(configB2.isValid === true, "Platform admin with leftover IDs should be valid");
    assert(configB2.businessId === null, "Platform admin must isolate and suppress leftover business ID");
    assert(configB2.institutionId === null, "Platform admin must isolate and suppress leftover institution ID");
    assert(getConfiguredInstitutionId() === null, "getConfiguredInstitutionId() must return null for Platform Admin");
    console.log("  ✓ Scenario B: Leftover business_id and institution_id are null; no leakage into Platform Admin");

    // Test 5: Error Case - Business mode without Business ID
    setEnv({ APP_MODE: "business", BUSINESS_ID: "", INSTITUTION_ID: "" });
    const configErr1 = getFrontendConfig();
    assert(configErr1.isValid === false, "Business mode without ID must be invalid");
    assert(Boolean(configErr1.error?.includes("Missing BUSINESS_ID")), "Should report missing BUSINESS_ID error");
    console.log("  ✓ Validation: APP_MODE=business with missing BUSINESS_ID reports clear error");

    // Test 6: Error Case - Unknown APP_MODE
    setEnv({ APP_MODE: "some_random_mode" });
    const configErr3 = getFrontendConfig();
    assert(configErr3.isValid === false, "Unknown APP_MODE must be invalid");
    assert(Boolean(configErr3.error?.includes("Unknown APP_MODE")), "Should report unknown APP_MODE error");
    console.log("  ✓ Validation: Unknown APP_MODE reports clear error and instructions");

    console.log("\n=== All Frontend Switching Tests Passed! ===\n");
  } finally {
    // Restore original env
    process.env = originalEnv;
  }
}

runTests();

