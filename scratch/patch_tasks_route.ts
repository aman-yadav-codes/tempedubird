import fs from 'fs';

const filePath = 'app/api/admin/operations/tasks/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `      if (isStarting) {
        updates.push("started_at = COALESCE(started_at, NOW())");`;

const replacement1 = `      if (isStarting) {
        updates.push("started_at = NOW()");`;

const target2 = `      // Auto-sync staff attendance working hours, check-in count, checkout, and task hours
      const syncStaffId = updatedTask.assigned_employee_id || (user as any)?.id;
      const syncInstId = updatedTask.institution_id || (user as any)?.institution_id;
      if (syncStaffId && syncInstId) {
        void syncTaskAttendanceToDatabase(db, syncStaffId, syncInstId).catch((e) =>
          console.error("Auto attendance sync error:", e)
        );
      }`;

const replacement2 = `      // Auto-sync staff attendance working hours, check-in count, checkout, and task hours
      const syncStaffId = updatedTask.assigned_employee_id || (user as any)?.id;
      const syncInstId = updatedTask.institution_id || (user as any)?.institution_id || (user as any)?.memberships?.[0]?.institution_id || 1;
      if (syncStaffId) {
        void syncTaskAttendanceToDatabase(db, syncStaffId, syncInstId).catch((e) =>
          console.error("Auto attendance sync error:", e)
        );
      }
      if ((user as any)?.id && Number((user as any).id) !== Number(syncStaffId)) {
        void syncTaskAttendanceToDatabase(db, (user as any).id, syncInstId).catch((e) =>
          console.error("Auto attendance sync error for acting user:", e)
        );
      }`;

// Normalize CRLF
let normContent = content.replace(/\r\n/g, '\n');
const normTarget1 = target1.replace(/\r\n/g, '\n');
const normReplacement1 = replacement1.replace(/\r\n/g, '\n');
const normTarget2 = target2.replace(/\r\n/g, '\n');
const normReplacement2 = replacement2.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget1)) {
  normContent = normContent.replace(normTarget1, normReplacement1);
  console.log('Target 1 replaced');
}
if (normContent.includes(normTarget2)) {
  normContent = normContent.replace(normTarget2, normReplacement2);
  console.log('Target 2 replaced');
}

const finalContent = content.includes('\r\n') ? normContent.replace(/\n/g, '\r\n') : normContent;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Finished updating tasks route.ts');
