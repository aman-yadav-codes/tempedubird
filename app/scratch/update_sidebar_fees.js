const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../../components/app-sidebar.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetLine = '                            { title: "Fee Management", url: "/admin/students/fee-management", icon: CreditCard },\r\n';
const targetLineLf = '                            { title: "Fee Management", url: "/admin/students/fee-management", icon: CreditCard },\n';

if (content.includes(targetLine)) {
  content = content.replace(targetLine, '');
  console.log('Removed targetLine CRLF!');
} else if (content.includes(targetLineLf)) {
  content = content.replace(targetLineLf, '');
  console.log('Removed targetLine LF!');
} else {
  console.log('Line not found by string!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
