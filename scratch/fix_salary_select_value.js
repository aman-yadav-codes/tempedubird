const fs = require('fs');

let dlg = fs.readFileSync('app/admin/staff/_components/staff-salary-dialog.tsx', 'utf8');
dlg = dlg.replace(
  '<SelectValue />',
  '<SelectValue>{new Date(currentMonth + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })}</SelectValue>'
);
fs.writeFileSync('app/admin/staff/_components/staff-salary-dialog.tsx', dlg, 'utf8');

let slips = fs.readFileSync('app/admin/staff/_components/staff-salary-slips-dialog.tsx', 'utf8');
slips = slips.replace(
  '<SelectValue />',
  '<SelectValue>{new Date(selectedMonth + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })}</SelectValue>'
);
fs.writeFileSync('app/admin/staff/_components/staff-salary-slips-dialog.tsx', slips, 'utf8');

console.log('Fixed SelectValue in both dialogs!');

