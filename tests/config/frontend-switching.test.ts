import {
  getFrontendConfig,
  isPlatformAdminMode,
  isInstitutionMode,
  getValidatedInstitutionId,
} from "../../lib/config/frontend-config";
import { getConfiguredInstitutionId } from "../../lib/tenancy/institution-domain";
import { getDefaultInstitutionId } from "../../lib/auth/active-institution";
import { isPlatformDeployment, isInstitutionDeployment } from "../../lib/deployment/app-mode";

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
    // Test 1: Scenario A - Institution Mode with ID 125
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

    // Test 2: Scenario A - Dynamic switching to Institution ID 200
    setEnv({ APP_MODE: "institution", INSTITUTION_ID: "200" });
    const configA2 = getFrontendConfig();
    assert(configA2.isValid === true, "Scenario A with 200 should be valid");
    assert(configA2.institutionId === 200, "Scenario A institutionId should dynamically switch to 200");
    assert(getConfiguredInstitutionId() === 200, "getConfiguredInstitutionId() should return 200");
    console.log("  ✓ Scenario A: Dynamic switching to INSTITUTION_ID=200 loads Institution 200");

    // Test 3: Scenario B - Platform Admin Mode
    setEnv({ APP_MODE: "platform_admin", INSTITUTION_ID: "" });
    const configB = getFrontendConfig();
    assert(configB.isValid === true, "Scenario B should be valid");
    assert(configB.mode === "platform_admin", "Scenario B mode should be 'platform_admin'");
    assert(configB.institutionId === null, "Platform admin mode must not have an institution ID");
    assert(isPlatformAdminMode() === true, "isPlatformAdminMode() should be true");
    assert(isInstitutionMode() === false, "isInstitutionMode() should be false");
    assert(isPlatformDeployment() === true, "isPlatformDeployment() should be true");
    assert(isInstitutionDeployment() === false, "isInstitutionDeployment() should be false");
    assert(getConfiguredInstitutionId() === null, "Platform admin must never return a configured institution ID");
    assert(getDefaultInstitutionId() === null, "Platform admin must never return a default institution ID");
    console.log("  ✓ Scenario B: APP_MODE=platform_admin works and requires NO Institution ID");

    // Test 4: Scenario B - Platform Admin Mode ignores any leftover institution ID (no data leakage)
    setEnv({ APP_MODE: "platform_admin", INSTITUTION_ID: "999" });
    const configB2 = getFrontendConfig();
    assert(configB2.isValid === true, "Platform admin with leftover ID should be valid");
    assert(configB2.institutionId === null, "Platform admin must isolate and suppress leftover institution IDs");
    assert(getConfiguredInstitutionId() === null, "getConfiguredInstitutionId() must return null for Platform Admin");
    console.log("  ✓ Scenario B: Leftover institution IDs are ignored; no institution data leaks into Platform Admin");

    // Test 5: Error Case - Institution mode without Institution ID
    setEnv({ APP_MODE: "institution", INSTITUTION_ID: "" });
    const configErr1 = getFrontendConfig();
    assert(configErr1.isValid === false, "Institution mode without ID must be invalid");
    assert(Boolean(configErr1.error?.includes("Missing INSTITUTION_ID")), "Should report missing INSTITUTION_ID error");
    console.log("  ✓ Validation: APP_MODE=institution with missing INSTITUTION_ID reports clear error");

    // Test 6: Error Case - Institution mode with invalid non-numeric ID
    setEnv({ APP_MODE: "institution", INSTITUTION_ID: "abc" });
    const configErr2 = getFrontendConfig();
    assert(configErr2.isValid === false, "Institution mode with non-numeric ID must be invalid");
    assert(Boolean(configErr2.error?.includes("Invalid INSTITUTION_ID")), "Should report invalid INSTITUTION_ID error");
    console.log("  ✓ Validation: APP_MODE=institution with invalid non-numeric ID reports clear error");

    // Test 7: Error Case - Unknown APP_MODE
    setEnv({ APP_MODE: "some_random_mode" });
    const configErr3 = getFrontendConfig();
    assert(configErr3.isValid === false, "Unknown APP_MODE must be invalid");
    assert(Boolean(configErr3.error?.includes("Unknown APP_MODE")), "Should report unknown APP_MODE error");
    console.log("  ✓ Validation: Unknown APP_MODE reports clear error and instructions");

    console.log("\n=== All 7 Frontend Switching Tests Passed! ===\n");
  } finally {
    // Restore original env
    process.env = originalEnv;
  }
}

runTests();
