const fs = require('fs');
const content = fs.readFileSync('app/admin/generate/page.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(540, 620).join('\n'));
