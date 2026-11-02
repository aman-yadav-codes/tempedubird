const fs = require('fs');
let content = fs.readFileSync('lib/auth/permissions.ts', 'utf8');
const isCRLF = content.includes('\r\n');
if (isCRLF) content = content.replace(/\r\n/g, '\n');

const target1 = `  if (normalized === "/admin/operations" || normalized.startsWith("/admin/operations/")) {
    if (normalized === "/admin/operations/tasks") {
      return !isStudentUser(user) && !isParentUser(user);
    }
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }`;

const replacement1 = `  if (normalized === "/admin/operations" || normalized.startsWith("/admin/operations/")) {
    if (normalized === "/admin/operations/tasks") {
      return !isStudentUser(user) && !isParentUser(user);
    }
    return (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      hasPermission(user, "operations.tasks.manage") ||
      hasPermission(user, "operations.tasks.view_all") ||
      hasPermission(user, "managestaff.tasks")
    );
  }`;

const target2 = `  if (normalized === "/admin/operations" || normalized.startsWith("/admin/operations")) {
    if (normalized === "/admin/operations/tasks") {
      return !isStudentUser(user) && !isParentUser(user);
    }
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }`;

const replacement2 = `  if (normalized === "/admin/operations" || normalized.startsWith("/admin/operations")) {
    if (normalized === "/admin/operations/tasks") {
      return !isStudentUser(user) && !isParentUser(user);
    }
    return (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      hasPermission(user, "operations.tasks.manage") ||
      hasPermission(user, "operations.tasks.view_all") ||
      hasPermission(user, "managestaff.tasks")
    );
  }`;

if (content.includes(target1)) content = content.replace(target1, replacement1);
if (content.includes(target2)) content = content.replace(target2, replacement2);

if (isCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync('lib/auth/permissions.ts', content, 'utf8');
console.log('Updated lib/auth/permissions.ts permissions for operations routes!');

