const fs = require('fs');
let code = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');
const lines = code.split(/\r?\n/);
const startIdx = lines.findIndex(l => l.includes('// Fetch list of clients for picker'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('// Fetch list of staff/employees for picker'));

console.log("Replacing lines", startIdx, "to", endIdx);

const cleanSnippet = [
  '    // Fetch list of clients for picker',
  '    // Show all active clients associated with the logged-in institution / platform staff',
  '    const effectiveClientId = targetInstId || userInstId || 1;',
  '    const clientsRes = await db.query(',
  '      `SELECT id, name, company_name, email, phone, client_type, institution_id',
  '       FROM clients',
  '       WHERE status = \'active\'',
  '         AND (institution_id = $1::int OR institution_id IS NULL)',
  '       ORDER BY COALESCE(company_name, name) ASC`,',
  '      [effectiveClientId]',
  '    );',
  '    '
];

lines.splice(startIdx, endIdx - startIdx, ...cleanSnippet);
fs.writeFileSync('app/api/admin/operations/tasks/route.ts', lines.join('\r\n'), 'utf8');
console.log('Fixed route.ts cleanly!');

