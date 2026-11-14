const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "lib", "auth", "permissions.ts");
let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

// 1. isClientUser fix
const clientIdx = lines.findIndex(l => l.includes("export function isClientUser("));
if (clientIdx !== -1) {
  lines.splice(
    clientIdx,
    10,
    "export function isClientUser(",
    "  user: {",
    "    role_codes?: string[];",
    "    is_super_admin?: boolean;",
    "    has_business_profile?: boolean;",
    "    has_professional_profile?: boolean;",
    "  } | null | undefined",
    ") {",
    "  if (!user) return false;",
    "  if (user.is_super_admin || isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return false;",
    "  return Boolean(user?.role_codes?.includes(\"client\"));",
    "}"
  );
}

// 2. isCustomerUser fix
const custIdx = lines.findIndex(l => l.includes("export function isCustomerUser("));
if (custIdx !== -1) {
  // Find where it checks user.is_super_admin
  const checkIdx = lines.findIndex((l, i) => i > custIdx && i < custIdx + 15 && l.includes("user.is_super_admin"));
  if (checkIdx !== -1) {
    lines.splice(
      checkIdx,
      2,
      "  if (user.is_super_admin || user.role_codes?.includes(\"platform_admin\") || isInstitutionAdminUser(user)) return false;",
      "  if (user.has_business_profile || user.has_professional_profile) return false;"
    );
  }
}

// 3. isAdminPathVisibleForRole fix
const visibleIdx = lines.findIndex(l => l.includes("export function isAdminPathVisibleForRole("));
if (visibleIdx !== -1) {
  // Find "const normalized = normalizeAdminPath(pathname);"
  const normIdx = lines.findIndex((l, i) => i > visibleIdx && i < visibleIdx + 15 && l.includes("normalizeAdminPath(pathname);"));
  if (normIdx !== -1) {
    lines.splice(
      normIdx + 1,
      0,
      "  if (isPlatformAdminUser(user)) {",
      "    return !PLATFORM_ADMIN_HIDDEN_PATHS.some(",
      "      (hiddenPath) =>",
      "        normalized === hiddenPath ||",
      "        normalized.startsWith(`${hiddenPath}/`)",
      "    );",
      "  }",
      "  if (isInstitutionAdminUser(user)) {",
      "    if (normalized === \"/admin/users\" || normalized.startsWith(\"/admin/users/\")) return false;",
      "    if (normalized === \"/admin/profiles\" || normalized.startsWith(\"/admin/profiles/\")) return false;",
      "    if (normalized === \"/admin/categories\" || normalized.startsWith(\"/admin/categories/\")) return false;",
      "    if (normalized === \"/admin/catalog\" || normalized.startsWith(\"/admin/catalog/\")) return false;",
      "    if (normalized === \"/admin/locations\" || normalized.startsWith(\"/admin/locations/\")) return false;",
      "    if (normalized === \"/admin/institutions\" || normalized.startsWith(\"/admin/institutions/\")) return false;",
      "    if (normalized === \"/admin/classroom\" || normalized.startsWith(\"/admin/classroom/\")) return false;",
      "    if (normalized === \"/admin/students\" || normalized.startsWith(\"/admin/students/\")) return false;",
      "    return true;",
      "  }"
    );
  }
}

// 4. hasAdminPagePermission fix
const pagePermIdx = lines.findIndex(l => l.includes("export function hasAdminPagePermission("));
if (pagePermIdx !== -1) {
  const normIdx2 = lines.findIndex((l, i) => i > pagePermIdx && i < pagePermIdx + 15 && l.includes("isAdminPathVisibleForRole(user, normalized)"));
  if (normIdx2 !== -1) {
    lines.splice(
      normIdx2 + 1,
      0,
      "  if (isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return true;"
    );
  }
}

// 5. hasPermission fix for isInstitutionAdminUser
const hasPermIdx = lines.findIndex(l => l.includes("export function hasPermission("));
if (hasPermIdx !== -1) {
  const instCheckIdx = lines.findIndex((l, i) => i > hasPermIdx && i < hasPermIdx + 30 && l.includes("if (isInstitutionAdminUser(user)) {"));
  if (instCheckIdx !== -1) {
    lines.splice(
      instCheckIdx,
      8,
      "  if (isInstitutionAdminUser(user)) {",
      "    return true;",
      "  }"
    );
  }
}

fs.writeFileSync(filePath, lines.join("\n"), "utf8");
console.log("Successfully applied all permissions fixes!");

