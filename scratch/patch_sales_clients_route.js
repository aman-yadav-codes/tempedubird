const fs = require('fs');

// 1. Patch app/api/admin/sales/clients/route.ts
let clientsRoute = fs.readFileSync('app/api/admin/sales/clients/route.ts', 'utf8');

const targetSalesCheck = `    const isPlatformAdmin = isPlatformAdminUser(user);
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

const replaceSalesCheck = `    const isPlatformAdmin = isPlatformAdminUser(user);
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

if (clientsRoute.includes(targetSalesCheck)) {
  clientsRoute = clientsRoute.replace(targetSalesCheck, replaceSalesCheck);
  fs.writeFileSync('app/api/admin/sales/clients/route.ts', clientsRoute, 'utf8');
  console.log('Successfully updated app/api/admin/sales/clients/route.ts');
} else {
  console.log('targetSalesCheck not found');
}

