const fs = require('fs');

function fixFile(filePath, searchStr, replaceStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  } else {
    console.log('Target not found in', filePath);
  }
}

// 1. staff-salary-dialog.tsx
fixFile(
  'app/admin/staff/_components/staff-salary-dialog.tsx',
  '<SelectValue>{new Date(currentMonth + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })}</SelectValue>',
  '<SelectValue placeholder="Select month" />'
);

// 2. staff-salary-slips-dialog.tsx
fixFile(
  'app/admin/staff/_components/staff-salary-slips-dialog.tsx',
  '<SelectValue>{new Date(selectedMonth + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })}</SelectValue>',
  '<SelectValue placeholder="Select month" />'
);

