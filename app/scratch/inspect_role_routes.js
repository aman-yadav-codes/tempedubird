const fs = require('fs');
const path = require('path');
const p = path.resolve('..', 'lib', 'auth', 'role-routes.ts');
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, 'utf8');
  console.log(content.substring(0, 1500));
} else {
  console.log('Not found:', p);
}
