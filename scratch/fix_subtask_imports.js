const fs = require('fs');
let content = fs.readFileSync('components/subtask-card.tsx', 'utf8');

content = content.replace(
  '  Trash2,',
  '  Trash2,\n  Users,\n  Check,\n  ChevronDown,'
);

fs.writeFileSync('components/subtask-card.tsx', content, 'utf8');
console.log('Fixed imports in subtask-card.tsx');

