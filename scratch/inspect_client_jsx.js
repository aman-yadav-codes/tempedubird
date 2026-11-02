const fs = require('fs');
const lines = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').split('\n');
const idxStart = lines.findIndex(l => l.includes('formProjectFor === "client" &&'));
console.log('idxStart:', idxStart);
let idxEnd = idxStart;
for (let i = idxStart; i < idxStart + 120; i++) {
  if (lines[i].includes('{/* Timeline: Start Date and Due Date */}')) {
    idxEnd = i;
    break;
  }
}
console.log('idxEnd:', idxEnd);
console.log(lines.slice(idxStart, idxEnd).join('\n'));

