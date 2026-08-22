type RoleRouteUser = {
  role_codes?: string[];
  primary_role?: string | null;
  is_super_admin?: boolean;
  permissions?: string[];
} | null | undefined;

const KNOWN_ROLE_PREFIXES = new Set(["admin", "institutionadmin", "institution-admin", "institute", "teacher", "student", "parent", "driver", "accountant", "guest"]);
const PUBLIC_TOP_LEVEL_SEGMENTS = new Set([
  "about",
  "account-suspended",
  "auth",
  "blogs",
  "contact",
  "copyright",
  "courses",
  "designations",
  "exams",
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
  "libraries",
  "login",
  "notes",
  "packages",
  "practice",
  "privacy",
  "refund-policy",
  "reset-password",
  "signup",
  "teachers",
  "terms",
  "test",
]);
const ADMIN_CHILD_SEGMENTS = new Set([
  "access-control",
  "account",
  "ai-settings",
  "analytics",
  "classroom",
  "children",
  "company",
  "content",
  "dashboard",
  "finance",
  "guardians",
  "institution",
  "institutions",
  "marketing",
  "master-data",
  "notifications",
  "profile",
  "sales",
  "settings",
  "staff",
  "students",
  "support",
  "tracker",
  "users",
]);

const ROLE_PREFIX_MAP: Record<string, string> = {
  platform_admin: "admin",
  accountant: "admin",
  guest: "admin",
  institution_admin: "institutionadmin",
  professional_organization: "institutionadmin",
  school_owner: "institutionadmin",
  college_owner: "institutionadmin",
  university_owner: "institutionadmin",
  library_owner: "institutionadmin",
  pg_owner: "institutionadmin",
  teacher: "admin",
  student: "student",
  parent: "parent",
  guardian: "parent",
  driver: "driver",
};

const PREFIX_PRIORITY = [
  "platform_admin",
  "accountant",
  "guest",
  "institution_admin",
  "professional_organization",
  "school_owner",
  "college_owner",
  "university_owner",
  "library_owner",
  "pg_owner",
  "teacher",
  "student",
  "parent",
  "guardian",
  "driver",
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
  if (user?.is_super_admin || user?.role_codes?.includes("platform_admin")) return "admin";

  const roleCodes = user?.role_codes ?? [];
  const mappedRole = PREFIX_PRIORITY.find((roleCode) => roleCodes.includes(roleCode));
  if (mappedRole) return ROLE_PREFIX_MAP[mappedRole];

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

  if (!firstSegment || firstSegment === "admin") {
    return `${pathOnly.replace(/\/+$/, "") || "/admin"}${query ? `?${query}` : ""}`;
  }

  if (PUBLIC_TOP_LEVEL_SEGMENTS.has(firstSegment) || firstSegment.startsWith("_next") || firstSegment.includes(".")) {
    return pathname;
  }

  const looksLikeRolePortalPath =
    isKnownRoleRoutePrefix(firstSegment) ||
    parts.length === 1 ||
    ADMIN_CHILD_SEGMENTS.has(parts[1]);

  if (looksLikeRolePortalPath) {
    const rest = parts.slice(1).join("/");
    return `/admin${rest ? `/${rest}` : ""}${query ? `?${query}` : ""}`;
  }

  return pathname;
}

export function toRoleRoutePath(pathname: string, user: RoleRouteUser) {
  let canonical = toCanonicalAdminPath(pathname);
  if (canonical === "/admin/dashboard") {
    canonical = "/admin";
  } else if (canonical === "/admin/profile") {
    canonical = "/admin/account";
  }
  const base = getRoleRouteBase(user);

  if (base === "/admin") return canonical;
  if (canonical === "/admin") {
    if (base === "/student") return "/student/dashboard";
    return base;
  }
  if (canonical.startsWith("/admin/")) return `${base}${canonical.slice("/admin".length)}`;

  return canonical;
}

export function shouldUseRoleRoutePrefix(pathname: string, user: RoleRouteUser) {
  const rolePath = toRoleRoutePath(pathname, user);
  return rolePath !== pathname && rolePath.startsWith("/");
}
