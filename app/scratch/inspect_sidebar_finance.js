const fs = require('fs');
const path = require('path');
const sidebarPath = path.resolve('..', 'components', 'app-sidebar.tsx');
const content = fs.readFileSync(sidebarPath, 'utf8');
const lines = content.split('\n');

console.log('--- Lines 290-310 ---');
for (let i = 289; i < Math.min(lines.length, 310); i++) {
  console.log((i + 1) + ': ' + lines[i]);
}

console.log('--- Lines 825-855 ---');
for (let i = 824; i < Math.min(lines.length, 855); i++) {
  console.log((i + 1) + ': ' + lines[i]);
}
