const fs = require('fs');
let content = fs.readFileSync('lib/auth/role-routes.ts', 'utf8');
if (!content.includes('"operations",')) {
  content = content.replace(
    '"notifications",',
    '"notifications",\n  "operations",'
  );
  fs.writeFileSync('lib/auth/role-routes.ts', content, 'utf8');
  console.log('Added operations to ADMIN_CHILD_SEGMENTS in role-routes.ts');
} else {
  console.log('operations already in role-routes.ts');
}

