type RoleRouteUser = {
  role_codes?: string[];
  primary_role?: string | null;
  is_super_admin?: boolean;
  permissions?: string[];
} | null | undefined;

const KNOWN_ROLE_PREFIXES = new Set([
  "workspace",
  "admin",
  "platformadmin",
  "instituteadmin",
  "institutionadmin",
  "institution-admin",
  "institute",
  "staff",
  "teacher",
  "student",
  "students",
  "parent",
  "parents",
  "driver",
  "accountant",
  "guest",
  "client",
  "customer",
]);
const PUBLIC_TOP_LEVEL_SEGMENTS = new Set([
  "about",
  "account-suspended",
  "auth",
  "blogs",
  "business",
  "businesses",
  "contact",
  "copyright",
  "courses",
  "designations",
  "exams",
  "explore",
  "facilities",
  "faqs",
  "forgot-password",
  "gallery",
  "help",
  "hostels",
  "icons",
  "images",
  "institutes",
  "institution",
  "institutions",
  "jobs",
  "libraries",
  "login",
  "notes",
  "packages",
  "practice",
  "privacy",
  "products",
  "professional",
  "professionals",
  "refund-policy",
  "reset-password",
  "search",
  "signup",
  "storefront",
  "teachers",
  "team",
  "terms",
  "test",
  "vendors",
]);
const ADMIN_CHILD_SEGMENTS = new Set([
  "access-control",
  "affiliate",
  "account",
  "ai-settings",
  "analytics",
  "business-type-access",
  "categories",
  "catalog",
  "classroom",
  "children",
  "calendar",
  "company",
  "complaints",
  "content",
  "dashboard",
  "finance",
  "generate",
  "guardians",
  "institution",
  "institutions",
  "inventory",
  "locations",
  "marketing",
  "master-data",
  "noticeboard",
  "notifications",
  "operations",
  "my-profile",
  "profile",
  "profiles",
  "reviews",
  "sales",
  "seo-locations",
  "settings",
  "staff",
  "students",
  "support",
  "team",
  "tracker",
  "users",
  "vendors",
]);

const ROLE_PREFIX_MAP: Record<string, string> = {
  platform_admin: "platformadmin",
  accountant: "platformadmin",
  guest: "platformadmin",
  institution_admin: "workspace",
  business_owner: "workspace",
  professional_provider: "workspace",
  professional_organization: "workspace",
  school_owner: "workspace",
  college_owner: "workspace",
  university_owner: "workspace",
  library_owner: "workspace",
  pg_owner: "workspace",
  teacher: "staff",
  faculty: "staff",
  hod: "staff",
  tutor: "staff",
  teaching_assistant: "staff",
  doubt_expert: "staff",
  academic_coordinator: "staff",
  admission_counselor: "staff",
  center_head: "staff",
  administrative_staff: "staff",
  staff: "staff",
  student: "students",
  parent: "parents",
  guardian: "parents",
  driver: "driver",
  client: "client",
  customer: "customer",
};

const PREFIX_PRIORITY = [
  "platform_admin",
  "accountant",
  "guest",
  "business_owner",
  "professional_provider",
  "institution_admin",
  "professional_organization",
  "school_owner",
  "college_owner",
  "university_owner",
  "library_owner",
  "pg_owner",
  "teacher",
  "faculty",
  "hod",
  "tutor",
  "teaching_assistant",
  "doubt_expert",
  "academic_coordinator",
  "admission_counselor",
  "center_head",
  "administrative_staff",
  "staff",
  "student",
  "parent",
  "guardian",
  "driver",
  "client",
  "customer",
];

export function sanitizeRolePathSegment(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "account";
}

export function getRoleRoutePrefix(user: RoleRouteUser) {
  if (user?.is_super_admin || user?.role_codes?.includes("platform_admin")) return "platformadmin";

  const roleCodes = user?.role_codes ?? [];
  const mappedRole = PREFIX_PRIORITY.find((roleCode) => roleCodes.includes(roleCode));
  if (mappedRole) return ROLE_PREFIX_MAP[mappedRole];

  const primaryLower = user?.primary_role?.toLowerCase() ?? "";
  if (
    primaryLower.includes("teacher") ||
    primaryLower.includes("faculty") ||
    primaryLower.includes("staff") ||
    primaryLower.includes("tutor") ||
    primaryLower.includes("counselor")
  ) {
    return "staff";
  }

  return sanitizeRolePathSegment(roleCodes[0] ?? user?.primary_role);
}

export function getRoleRouteBase(user: RoleRouteUser) {
  return `/${getRoleRoutePrefix(user)}`;
}

export function isKnownRoleRoutePrefix(prefix: string) {
  return KNOWN_ROLE_PREFIXES.has(prefix);
}

export function toCanonicalAdminPath(pathname: string) {
  const [pathOnly, query = ""] = pathname.split("?");
  const parts = pathOnly.split("/").filter(Boolean);
  const firstSegment = parts[0];

  if (!firstSegment || firstSegment === "admin" || firstSegment === "workspace" || firstSegment === "platformadmin" || firstSegment === "instituteadmin" || firstSegment === "institutionadmin" || firstSegment === "staff" || firstSegment === "client" || firstSegment === "customer") {
    const rest = parts.slice(1).join("/");
    return `/admin${rest ? `/${rest}` : ""}${query ? `?${query}` : ""}`;
  }

  if (PUBLIC_TOP_LEVEL_SEGMENTS.has(firstSegment) || firstSegment.startsWith("_next") || firstSegment.includes(".")) {
    return pathname;
  }

  const looksLikeRolePortalPath =
    isKnownRoleRoutePrefix(firstSegment) ||
    ADMIN_CHILD_SEGMENTS.has(parts[1]);

  if (looksLikeRolePortalPath) {
    const rest = parts.slice(1).join("/");
    return `/admin${rest ? `/${rest}` : ""}${query ? `?${query}` : ""}`;
  }

  return pathname;
}

export function toRoleRoutePath(pathname: string, user: RoleRouteUser) {
  let canonical = toCanonicalAdminPath(pathname);
  if (!canonical.startsWith("/admin")) {
    return pathname;
  }

  if (canonical === "/admin/dashboard") {
    canonical = "/admin";
  } else if (canonical === "/admin/profile") {
    canonical = "/admin/account";
  } else if (canonical === "/admin/institution/complaints") {
    canonical = "/admin/complaints";
  } else if (canonical === "/admin/institutions/news") {
    canonical = "/admin/noticeboard";
  }
  const base = getRoleRouteBase(user);

  if (base === "/workspace") {
    if (canonical === "/admin") return "/workspace";
    if (canonical.startsWith("/admin/")) return `/workspace${canonical.slice("/admin".length)}`;
    return canonical;
  }

  if (base === "/students") {
    if (canonical === "/admin") return "/students";
    if (canonical.startsWith("/admin/")) return `/students${canonical.slice("/admin".length)}`;
    return canonical;
  }

  if (base === "/parents") {
    if (canonical === "/admin") return "/parents";
    if (canonical.startsWith("/admin/")) return `/parents${canonical.slice("/admin".length)}`;
    return canonical;
  }

  if (base === "/client") {
    if (canonical === "/admin" || canonical === "/admin/operations/tasks") return "/client/operations/tasks";
    if (canonical.startsWith("/admin/")) return `/client${canonical.slice("/admin".length)}`;
    return canonical;
  }

  if (base === "/customer") {
    if (canonical === "/admin") return "/customer";
    if (canonical.startsWith("/admin/")) return `/customer${canonical.slice("/admin".length)}`;
    return canonical;
  }

  if (canonical === "/admin") {
    return base;
  }
  if (canonical.startsWith("/admin/")) return `${base}${canonical.slice("/admin".length)}`;

  return canonical;
}

export function shouldUseRoleRoutePrefix(pathname: string, user: RoleRouteUser) {
  const canonical = toCanonicalAdminPath(pathname);
  if (!canonical.startsWith("/admin")) return false;
  const rolePath = toRoleRoutePath(pathname, user);
  return rolePath !== pathname && rolePath.startsWith("/");
}
