import Module from "node:module";
import path from "node:path";

const workspaceRoot = path.resolve(__dirname, "..");
type ModuleResolver = (
  request: string,
  parent?: NodeModule | null,
  isMain?: boolean,
  options?: unknown,
) => string;
const moduleWithResolver = Module as unknown as { _resolveFilename: ModuleResolver };
const originalResolveFilename = moduleWithResolver._resolveFilename;
moduleWithResolver._resolveFilename = function resolveAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(workspaceRoot, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { db } = await import("../lib/db/db");
const { syncPermissionRegistry } = await import("../lib/auth/sync-permission-registry");

async function main() {
  await syncPermissionRegistry(db, true);
  const result = await db.query(`
    SELECT r.code AS role_code, p.code AS permission_code
    FROM role_permissions rp
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE p.code LIKE 'student.%'
       OR p.code LIKE 'parent.%'
       OR p.code LIKE 'teacher.%'
       OR p.code LIKE 'notifications.%'
    ORDER BY r.code, p.code
  `);
  const retired = await db.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM permissions
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (
        code LIKE 'classroom.%'
        OR code = 'parent.student_records.view'
        OR code = 'myinstitution.institution_calendar.view'
      )
  `);
  const mismatched = await db.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM role_permissions rp
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE (p.code LIKE 'student.%' AND r.code <> 'student')
       OR (p.code LIKE 'parent.%' AND r.code <> 'parent')
       OR (p.code LIKE 'teacher.%' AND r.code <> 'teacher')
       OR (
         r.code = 'student'
         AND p.code NOT LIKE 'student.%'
       )
       OR (
         r.code = 'parent'
         AND p.code NOT LIKE 'parent.%'
         AND p.code NOT LIKE 'notifications.%'
         AND p.code <> 'parents.support.view'
       )
       OR (
         r.code = 'teacher'
         AND p.code NOT LIKE 'teacher.%'
         AND p.code NOT LIKE 'managestudents.%'
         AND p.code NOT LIKE 'content.%'
         AND p.code NOT LIKE 'notifications.%'
         AND p.code NOT LIKE 'support.%'
         AND p.code NOT LIKE 'settings.payments.%'
       )
  `);
  if (Number(retired.rows[0]?.count) > 0 || Number(mismatched.rows[0]?.count) > 0) {
    throw new Error("Role permission migration integrity check failed");
  }
  console.log(JSON.stringify(result.rows, null, 2));
  await db.end();
}

void main();
