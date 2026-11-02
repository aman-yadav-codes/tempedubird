const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

if (!content.includes('import Link from "next/link";')) {
  content = content.replace(
    'import { useSearchParams, usePathname } from "next/navigation";',
    'import { useSearchParams, usePathname } from "next/navigation";\nimport Link from "next/link";'
  );
}

if (!content.includes('  Check,') && !content.includes(', Check,')) {
  content = content.replace(
    '  ClipboardCheck,',
    '  Check,\n  ClipboardCheck,'
  );
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Fixed Link and Check in app/admin/operations/tasks/page.tsx');

