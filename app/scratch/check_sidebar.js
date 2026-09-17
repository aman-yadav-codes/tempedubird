const fs = require('fs');
const path = require('path');
const sidebarPath = path.resolve('..', 'components', 'app-sidebar.tsx');
if (fs.existsSync(sidebarPath)) {
  const content = fs.readFileSync(sidebarPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes('finance')) {
      console.log('Line ' + (i + 1) + ': ' + line.trim());
    }
  });
} else {
  console.log('Sidebar not found at', sidebarPath);
}
