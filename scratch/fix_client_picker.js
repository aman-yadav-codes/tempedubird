const fs = require('fs');
let code = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');

const needle = "WHERE status = 'active' \n           AND institution_id IS NULL";
const crlfNeedle = "WHERE status = 'active' \r\n           AND institution_id IS NULL";

console.log("has LF:", code.includes(needle), "has CRLF:", code.includes(crlfNeedle));

code = code.replace(
  /(\/\/ Fetch list of clients for picker[\s\S]*?clientsRes\s*=\s*await db\.query\([\s\S]*?ORDER BY COALESCE\(company_name, name\) ASC`[\s\S]*?\);[\s\S]*?})/,
  `// Fetch list of clients for picker
    // Show all active clients associated with the logged-in institution / platform staff
    const effectiveClientId = targetInstId || userInstId || 1;
    const clientsRes = await db.query(
      \`SELECT id, name, company_name, email, phone, client_type, institution_id 
       FROM clients 
       WHERE status = 'active' 
         AND (institution_id = $1::int OR institution_id IS NULL)
       ORDER BY COALESCE(company_name, name) ASC\`,
      [effectiveClientId]
    );`
);

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', code, 'utf8');
console.log("Updated route.ts successfully!");

