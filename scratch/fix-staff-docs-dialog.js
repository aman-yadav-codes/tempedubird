const fs = require('fs');

const filePath = 'app/admin/staff/_components/staff-documents-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden"',
  'className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden"'
);

content = content.replace(
  'className="flex-1 overflow-y-auto pt-2 space-y-4 pr-1"',
  'className="flex-1 overflow-y-auto pt-2 space-y-4 pr-1 pb-8"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated staff-documents-dialog.tsx');

