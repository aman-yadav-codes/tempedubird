const fs = require('fs');
const path = require('path');
const p = path.resolve('..', 'components', 'app-sidebar.tsx');
try {
  fs.accessSync(p, fs.constants.W_OK);
  console.log('Writable: true');
} catch (e) {
  console.log('Writable: false', e.message);
}
