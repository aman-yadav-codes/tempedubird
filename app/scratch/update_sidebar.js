const fs = require('fs');
const path = require('path');
const sidebarPath = path.resolve('..', 'components', 'app-sidebar.tsx');
let content = fs.readFileSync(sidebarPath, 'utf8');

// Check if Bus is imported
if (!content.includes('Bus,') && !content.includes(', Bus') && !content.includes('{ Bus }')) {
  content = content.replace('IndianRupee,', 'Bus, IndianRupee,');
  console.log('Added Bus import');
}

// Check if Transportation Fee is in Finance children
if (!content.includes('/admin/finance/transportation-fee')) {
  const target = '{ title: "Finance Categories", url: "/admin/finance/categories", icon: Tags },';
  const addition = '\n            { title: "Transportation Fee", url: "/admin/finance/transportation-fee", icon: Bus },';
  if (content.includes(target)) {
    content = content.replace(target, target + addition);
    console.log('Added Transportation Fee to Finance children');
  } else {
    console.log('Target string not found in sidebar');
  }
}

fs.writeFileSync(sidebarPath, content, 'utf8');
console.log('Updated app-sidebar.tsx successfully!');
