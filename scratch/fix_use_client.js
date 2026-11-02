const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// Move "use client"; to the very top
code = code.replace('"use client";', '');
code = '"use client";\n\n' + code.trimStart();

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Successfully placed "use client"; at the very top of page.tsx');

