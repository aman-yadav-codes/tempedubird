const fs = require('fs');
let c = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');

c = c.replaceAll('client_id = ${params.length}', 'client_id = $' + '{params.length}');
c = c.replaceAll("(elem->>'id')::int = ${params.length}", "(elem->>'id')::int = $" + '{params.length}');
c = c.replaceAll('client_name = ${params.length}', 'client_name = $' + '{params.length}');

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', c, 'utf8');
console.log('Fixed postgres parameter placeholders.');

