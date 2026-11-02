const fs = require('fs');

let content = fs.readFileSync('app/api/admin/sales/clients/route.ts', 'utf8').replace(/\r\n/g, '\n');

const search = `    const isPlatformAdmin = isPlatformAdminUser(user);
    if (isPlatformAdmin) {
      if (targetInstId) {
        params.push(targetInstId);
        query += \` AND (institution_id = \${params.length} OR institution_id IS NULL)\`;
      } else {
        query += \` AND (institution_id = 1 OR institution_id IS NULL)\`;
      }
    } else if (targetInstId) {
      params.push(targetInstId);
      query += \` AND institution_id = \${params.length}\`;
    } else {
      query += \` AND 1=0\`;
    }`;

const replace = `    const isPlatformAdmin = isPlatformAdminUser(user);
    const effectiveInst = targetInstId || userInstId || 1;
    if (isPlatformAdmin) {
      if (targetInstId) {
        params.push(targetInstId);
        query += \` AND (institution_id = $\${params.length} OR institution_id IS NULL)\`;
      } else {
        query += \` AND (institution_id = 1 OR institution_id IS NULL)\`;
      }
    } else {
      params.push(effectiveInst);
      query += \` AND (institution_id = $\${params.length} OR institution_id = 1 OR institution_id IS NULL)\`;
    }`;

if (content.includes(search)) {
  content = content.replace(search, replace);
  fs.writeFileSync('app/api/admin/sales/clients/route.ts', content, 'utf8');
  console.log('Successfully updated app/api/admin/sales/clients/route.ts');
} else {
  console.log('Still not found');
}

