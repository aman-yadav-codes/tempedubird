const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "components", "app-sidebar.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Master data titles
content = content.replace(
  `{ title: "Institution Types", url: "/admin/institutions/types", icon: Building },`,
  `{ title: "Business Types", url: "/admin/institutions/types", icon: Building },`
);
content = content.replace(
  `{ title: "Institution Subtypes", url: "/admin/institutions/subtypes", icon: Building },`,
  `{ title: "Business Subtypes", url: "/admin/institutions/subtypes", icon: Building },`
);
content = content.replace(
  `{ title: "Program Types", url: "/admin/institutions/program-types", icon: BookOpen },`,
  `{ title: "Program & Service Types", url: "/admin/institutions/program-types", icon: BookOpen },`
);
content = content.replace(
  `{ title: "Academic Sessions", url: "/admin/institutions/academic-years", icon: CalendarDays },`,
  `{ title: "Academic & Business Sessions", url: "/admin/institutions/academic-years", icon: CalendarDays },`
);

// 2. Main menu for institutions -> Businesses & Professionals
content = content.replace(
  `        title: "Institutions",\n        url: "/admin/institutions",\n        icon: Building,\n        children: [\n            {\n                title: "All Institutions",\n                url: "/admin/institutions/list",`,
  `        title: "Businesses & Professionals",\n        url: "/admin/institutions",\n        icon: Building,\n        children: [\n            {\n                title: "All Businesses & Professionals",\n                url: "/admin/institutions/list",`
);
content = content.replace(
  `                title: "Programs",\n                url: "/admin/institutions/programs",`,
  `                title: "Programs & Services",\n                url: "/admin/institutions/programs",`
);
content = content.replace(
  `                title: "Placements",\n                url: "/admin/institutions/placements",`,
  `                title: "Placements & Career",\n                url: "/admin/institutions/placements",`
);
content = content.replace(
  `                title: "Institution Cutoffs",\n                url: "/admin/institutions/cutoffs",`,
  `                title: "Eligibility & Cutoffs",\n                url: "/admin/institutions/cutoffs",`
);
content = content.replace(
  `                title: "Scholarships",\n                url: "/admin/institutions/scholarships",`,
  `                title: "Scholarships & Offers",\n                url: "/admin/institutions/scholarships",`
);

// 3. Calendar in Admin
content = content.replace(
  `{ title: "Institute Calendar", url: "/admin/master-data/institute-calendar", icon: CalendarDays },`,
  `{ title: "Business Calendar", url: "/admin/master-data/institute-calendar", icon: CalendarDays },`
);

// 4. Role name in cached institutions
content = content.replace(
  `roleName: isPlatformAdmin ? "Platform Admin" : "Institution Admin",`,
  `roleName: isPlatformAdmin ? "Platform Admin" : "Business Workspace",`
);

// 5. activeWorkspaceRole
content = content.replace(
  `                    : staffInstitution?.roleName ?? activeInstitution?.roleName ?? user?.primary_role ?? (user?.role_codes?.[0] ? formatStaffRole(user.role_codes[0]) : "Staff");`,
  `                    : isInstitutionAdmin
                        ? (user?.has_business_profile ? "Business Owner" : user?.has_professional_profile ? "Professional Provider" : "Business & Professional Admin")
                        : staffInstitution?.roleName ?? activeInstitution?.roleName ?? user?.primary_role ?? (user?.role_codes?.[0] ? formatStaffRole(user.role_codes[0]) : "Staff");`
);

// 6. Switcher label
content = content.replace(
  `canSwitchChild ? "Children" : canSwitchStudentEnrollment ? "Enrolled Institutions & Programs" : "Institutions"`,
  `canSwitchChild ? "Children" : canSwitchStudentEnrollment ? "Enrolled Institutions & Programs" : "Businesses & Workspaces"`
);

// 7. Fallback roleName in switcher
content = content.replace(
  `{institution.roleName ?? "Institution"}`,
  `{institution.roleName ?? "Business Workspace"}`
);

// 8. Label "Platform" -> "Workspace" for institution admin
content = content.replace(
  `] : [{ label: "Platform", items: visibleNavItems }]).map((group) => (`,
  `] : [{ label: isInstitutionAdmin ? "Workspace" : "Platform", items: visibleNavItems }]).map((group) => (`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully updated components/app-sidebar.tsx");

