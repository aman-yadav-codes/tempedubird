const fs = require('fs');
let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

content = content.replace(
  `  notes?: string | null;\r\n  uploads?: any[];\r\n  work_updates?: any[];`,
  `  notes?: string | null;\r\n  uploads?: any[];\r\n  work_updates?: any[];\r\n  started_by_name?: string | null;\r\n  started_by_id?: number | string | null;\r\n  started_at?: string | null;\r\n  stopped_at?: string | null;`
);

content = content.replace(
  `if (s.started_by_name) teamMembers.add(String(s.started_by_name).trim());`,
  `if ((s as any).started_by_name) teamMembers.add(String((s as any).started_by_name).trim());`
);

fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Fixed TypeScript fields in SubTask');

