const fs = require('fs');

let lines = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('INSERT INTO operations_tasks'));
console.log('Found INSERT at line:', idx);

// Update finalClientId and finalClientName right before INSERT
lines[idx - 16] = `    const assignedClients = Array.isArray(body.assigned_clients) ? body.assigned_clients : [];
    const finalClientName = project_for === "client" ? (assignedClients.length > 0 ? assignedClients.map((c: any) => c.company_name || c.name).filter(Boolean).join(", ") : (client_name?.trim() || "Client")) : "EduBird";
    const finalClientId = project_for === "client" ? (client_id ? parseInt(String(client_id).replace("vendor_", "")) : (assignedClients.length > 0 && assignedClients[0]?.id ? parseInt(String(assignedClients[0].id)) : null)) : null;`;

// Update INSERT column list and values
for (let i = idx; i < idx + 20; i++) {
  if (lines[i].includes('created_at, updated_at, attachments')) {
    lines[i] = lines[i].replace('created_at, updated_at, attachments', 'created_at, updated_at, attachments, assigned_clients');
    console.log('Updated column list');
  }
  if (lines[i].includes('NOW(), NOW(), $35::jsonb')) {
    lines[i] = lines[i].replace('NOW(), NOW(), $35::jsonb', 'NOW(), NOW(), $35::jsonb, $36::jsonb');
    console.log('Updated values list');
  }
}

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', lines.join('\n'), 'utf8');
console.log('Updated INSERT in route.ts');

