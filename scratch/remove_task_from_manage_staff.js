const fs = require('fs');
let content = fs.readFileSync('components/app-sidebar.tsx', 'utf8');

const target = '{ title: "Task Management", url: "/admin/operations/tasks", icon: ClipboardList },';
const firstIdx = content.indexOf(target);
const lastIdx = content.lastIndexOf(target);

console.log('firstIdx:', firstIdx, 'lastIdx:', lastIdx);
if (lastIdx !== -1 && lastIdx !== firstIdx) {
  // Find beginning of line and end of line including newline
  const lineStart = content.lastIndexOf('\n', lastIdx);
  const lineEnd = content.indexOf('\n', lastIdx);
  content = content.slice(0, lineStart) + content.slice(lineEnd);
  fs.writeFileSync('components/app-sidebar.tsx', content, 'utf8');
  console.log('Successfully removed second occurrence of Task Management (from Manage Staff).');
} else {
  console.log('Could not find second occurrence.');
}

