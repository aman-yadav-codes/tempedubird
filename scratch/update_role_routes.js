const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "lib", "auth", "role-routes.ts");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add "workspace" to KNOWN_ROLE_PREFIXES
content = content.replace(
  `const KNOWN_ROLE_PREFIXES = new Set([`,
  `const KNOWN_ROLE_PREFIXES = new Set([\n  "workspace",`
);

// 2. Map institution_admin and business roles to "workspace" in ROLE_PREFIX_MAP
content = content.replace(
  `  institution_admin: "instituteadmin",\n  professional_organization: "instituteadmin",\n  school_owner: "instituteadmin",\n  college_owner: "instituteadmin",\n  university_owner: "instituteadmin",\n  library_owner: "instituteadmin",\n  pg_owner: "instituteadmin",`,
  `  institution_admin: "workspace",\n  business_owner: "workspace",\n  professional_provider: "workspace",\n  professional_organization: "workspace",\n  school_owner: "workspace",\n  college_owner: "workspace",\n  university_owner: "workspace",\n  library_owner: "workspace",\n  pg_owner: "workspace",`
);

// 3. Update PREFIX_PRIORITY
content = content.replace(
  `  "institution_admin",`,
  `  "business_owner",\n  "professional_provider",\n  "institution_admin",`
);

// 4. Update toCanonicalAdminPath to recognize "workspace"
content = content.replace(
  `firstSegment === "admin" || firstSegment === "platformadmin" || firstSegment === "instituteadmin"`,
  `firstSegment === "admin" || firstSegment === "workspace" || firstSegment === "platformadmin" || firstSegment === "instituteadmin"`
);

// 5. Update toRoleRoutePath for workspace
content = content.replace(
  `  if (base === "/students") {`,
  `  if (base === "/workspace") {\n    if (canonical === "/admin") return "/workspace";\n    if (canonical.startsWith("/admin/")) return \`/workspace\${canonical.slice("/admin".length)}\`;\n    return "/workspace";\n  }\n\n  if (base === "/students") {`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully updated role-routes.ts");

