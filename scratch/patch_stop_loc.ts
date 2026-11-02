import fs from 'fs';

const filePath = 'app/api/admin/operations/tasks/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `      if (body.start_location) {
        params.push(JSON.stringify(body.start_location));
        updates.push(\`start_location = $\${params.length}::jsonb\`);
      }`;

const replacement = `      if (body.start_location) {
        params.push(JSON.stringify(body.start_location));
        updates.push(\`start_location = $\${params.length}::jsonb\`);
      }
      if (body.stop_location) {
        params.push(JSON.stringify(body.stop_location));
        updates.push(\`stop_location = $\${params.length}::jsonb\`);
      }`;

const target2 = `      } else if (isStopping) {
        updates.push("stopped_at = NOW()");
        taskHistory.push({
          id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
          action: "stopped",
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          user_role: currentUserRole,
          old_status: existingTask.status,
          new_status: "pending",
          subtask_id: body.subtask_id || null,
          subtask_title: body.subtask_title || null,
          details: body.subtask_title ? \`Deliverable "\${body.subtask_title}" stopped\` : "Task stopped",
        });`;

const replacement2 = `      } else if (isStopping) {
        updates.push("stopped_at = NOW()");
        taskHistory.push({
          id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
          action: "stopped",
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          user_role: currentUserRole,
          old_status: existingTask.status,
          new_status: "pending",
          subtask_id: body.subtask_id || null,
          subtask_title: body.subtask_title || null,
          location: body.stop_location || null,
          details: body.subtask_title ? \`Deliverable "\${body.subtask_title}" stopped\` : "Task stopped",
        });`;

let norm = content.replace(/\r\n/g, '\n');
const normT1 = target.replace(/\r\n/g, '\n');
const normR1 = replacement.replace(/\r\n/g, '\n');
const normT2 = target2.replace(/\r\n/g, '\n');
const normR2 = replacement2.replace(/\r\n/g, '\n');

if (norm.includes(normT1)) norm = norm.replace(normT1, normR1);
if (norm.includes(normT2)) norm = norm.replace(normT2, normR2);

const final = content.includes('\r\n') ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(filePath, final, 'utf8');
console.log("stop_location added to tasks route.ts");
