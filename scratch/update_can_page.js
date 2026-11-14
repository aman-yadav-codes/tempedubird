const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "components", "app-sidebar.tsx");
let content = fs.readFileSync(filePath, "utf8");

const oldCode = `    const canPage = useCallback((pathname: string) => {\n        if (isPlatformAdmin) {\n            return true;\n        }\n        if (isCustomer) {`;

const newCode = `    const canPage = useCallback((pathname: string) => {\n        if (isPlatformAdmin) {\n            return true;\n        }\n        if (isInstitutionAdmin) {\n            if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) return false;\n            if (pathname === "/admin/profiles" || pathname.startsWith("/admin/profiles/")) return false;\n            if (pathname === "/admin/categories" || pathname.startsWith("/admin/categories/")) return false;\n            if (pathname === "/admin/catalog" || pathname.startsWith("/admin/catalog/")) return false;\n            if (pathname === "/admin/locations" || pathname.startsWith("/admin/locations/")) return false;\n            if (pathname === "/admin/institutions" || pathname.startsWith("/admin/institutions/")) return false;\n            if (pathname === "/admin/classroom" || pathname.startsWith("/admin/classroom/")) return false;\n            if (pathname === "/admin/students" || pathname.startsWith("/admin/students/")) return false;\n            return true;\n        }\n        if (isCustomer) {`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("Updated canPage successfully!");
} else {
  // Try CRLF
  const oldCodeCRLF = oldCode.replace(/\n/g, "\r\n");
  const newCodeCRLF = newCode.replace(/\n/g, "\r\n");
  if (content.includes(oldCodeCRLF)) {
    content = content.replace(oldCodeCRLF, newCodeCRLF);
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Updated canPage (CRLF) successfully!");
  } else {
    console.log("Could not find oldCode");
  }
}

