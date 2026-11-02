const fs = require('fs');
let c = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');

c = c.split('client_id = ${params.length}').join('client_id = $' + '{params.length}');
c = c.split("(elem->>'id')::int = ${params.length}").join("(elem->>'id')::int = $" + '{params.length}');
c = c.split('client_name = ${params.length}').join('client_name = $' + '{params.length}');

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', c, 'utf8');
console.log('Fixed placeholders.');

