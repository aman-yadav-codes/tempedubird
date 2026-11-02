const fs = require('fs');
let lines = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8').split('\n');

// Remove those lines from mock data
lines = lines.filter(l => 
  !l.includes('const assignedClients = Array.isArray(body.assigned_clients)') &&
  !l.includes('const finalClientName = project_for === "client"') &&
  !l.includes('const finalClientId = project_for === "client"')
);

// Find single task creation in POST
const postSingleIdx = lines.findIndex(l => l.includes('const project_for = body.project_for === "client" ? "client" : "own_company";'));
if (postSingleIdx !== -1) {
  const insertCode = [
    '    const assignedClients = Array.isArray(body.assigned_clients) ? body.assigned_clients : [];',
    '    const finalClientName = project_for === "client" ? (assignedClients.length > 0 ? assignedClients.map((c: any) => c.company_name || c.name).filter(Boolean).join(", ") : (client_name?.trim() || "Client")) : "EduBird";',
    '    const finalClientId = project_for === "client" ? (client_id ? parseInt(String(client_id).replace("vendor_", "")) : (assignedClients.length > 0 && assignedClients[0]?.id ? parseInt(String(assignedClients[0].id)) : null)) : null;'
  ];
  // Replace existing finalClientName and finalClientId lines if present
  let replaced = false;
  for (let i = postSingleIdx; i < postSingleIdx + 10; i++) {
    if (lines[i].includes('finalClientName') || lines[i].includes('finalClientId')) {
      lines[i] = '';
      replaced = true;
    }
  }
  lines.splice(postSingleIdx + 2, 0, ...insertCode);
  lines = lines.filter(l => l !== '');
}

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', lines.join('\n'), 'utf8');
console.log('Fixed misplaced lines in route.ts successfully');

