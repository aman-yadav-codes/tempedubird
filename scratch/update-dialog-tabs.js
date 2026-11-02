const fs = require('fs');

const filePath = 'app/admin/users/add-user-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = '<li key={step.label} className="w-46 shrink-0 sm:w-48">';
const replacement = '<li key={step.label} className="shrink-0">';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  content = content.replace(
    '"flex h-12 w-full items-center gap-2 whitespace-nowrap rounded-md border px-3 text-left text-sm transition-colors"',
    '"flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 text-left text-xs font-semibold transition-colors"'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated tab button styling in add-user-dialog.tsx');
} else {
  console.log('Target not found in add-user-dialog.tsx');
}

