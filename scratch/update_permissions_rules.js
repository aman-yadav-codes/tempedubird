const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "lib", "auth", "permissions.ts");
let content = fs.readFileSync(filePath, "utf8");

// 1. Update isClientUser
content = content.replace(
  `export function isClientUser(
  user: {
    role_codes?: string[];
  } | null | undefined
) {
  return Boolean(user?.role_codes?.includes("client"));
}`,
  `export function isClientUser(
  user: {
    role_codes?: string[];
    is_super_admin?: boolean;
    has_business_profile?: boolean;
    has_professional_profile?: boolean;
  } | null | undefined
) {
  if (!user) return false;
  if (user.is_super_admin || isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return false;
  return Boolean(user?.role_codes?.includes("client"));
}`
);

// 2. Update isCustomerUser
content = content.replace(
  `  if (!user) return false;
  if (user.is_super_admin || user.role_codes?.includes("platform_admin")) return false;
  // If consumer listed business or professional profile, treat as institution admin, NOT customer
  if (user.has_business_profile || user.has_professional_profile) return false;`,
  `  if (!user) return false;
  if (user.is_super_admin || user.role_codes?.includes("platform_admin")) return false;
  if (isInstitutionAdminUser(user)) return false;
  if (user.has_business_profile || user.has_professional_profile) return false;`
);

// 3. Update isAdminPathVisibleForRole to give institution/business admins full access to their workspace
const targetVisible = `export function isAdminPathVisibleForRole(
  user: {
    role_codes?: string[];
    is_super_admin?: boolean;
    permissions?: string[];
  } | null | undefined,
  pathname: string
) {
  const normalized = normalizeAdminPath(pathname);
  if (isCustomerUser(user)) {`;

const newVisible = `export function isAdminPathVisibleForRole(
  user: {
    role_codes?: string[];
    is_super_admin?: boolean;
    permissions?: string[];
    has_business_profile?: boolean;
    has_professional_profile?: boolean;
  } | null | undefined,
  pathname: string
) {
  const normalized = normalizeAdminPath(pathname);
  if (isPlatformAdminUser(user)) {
    return !PLATFORM_ADMIN_HIDDEN_PATHS.some(
      (hiddenPath) =>
        normalized === hiddenPath ||
        normalized.startsWith(\`\${hiddenPath}/\`)
    );
  }
  if (isInstitutionAdminUser(user)) {
    // Platform-only modules
    if (normalized === "/admin/users" || normalized.startsWith("/admin/users/")) return false;
    if (normalized === "/admin/profiles" || normalized.startsWith("/admin/profiles/")) return false;
    if (normalized === "/admin/categories" || normalized.startsWith("/admin/categories/")) return false;
    if (normalized === "/admin/catalog" || normalized.startsWith("/admin/catalog/")) return false;
    if (normalized === "/admin/locations" || normalized.startsWith("/admin/locations/")) return false;
    if (normalized === "/admin/institutions" || normalized.startsWith("/admin/institutions/")) return false;
    if (normalized === "/admin/classroom" || normalized.startsWith("/admin/classroom/")) return false;
    if (normalized === "/admin/students" || normalized.startsWith("/admin/students/")) return false;
    return true;
  }
  if (isCustomerUser(user)) {`;

content = content.replace(targetVisible, newVisible);

// 4. Update hasAdminPagePermission to grant access to institution admins
const targetPagePerm = `  const normalized = normalizeAdminPath(pathname);
  if (!normalized.startsWith("/admin")) return true;
  if (!isAdminPathVisibleForRole(user, normalized)) return false;
  if (isCustomerUser(user)) return true;
  if (isClientUser(user)) return true;`;

const newPagePerm = `  const normalized = normalizeAdminPath(pathname);
  if (!normalized.startsWith("/admin")) return true;
  if (!isAdminPathVisibleForRole(user, normalized)) return false;
  if (isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return true;
  if (isCustomerUser(user)) return true;
  if (isClientUser(user)) return true;`;

content = content.replace(targetPagePerm, newPagePerm);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated permissions.ts successfully!");

