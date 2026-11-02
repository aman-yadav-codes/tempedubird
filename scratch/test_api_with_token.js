const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: '81', id: 81, typ: 'access' }, secret, { expiresIn: '1h' });

fetch('http://localhost:3000/api/admin/operations/tasks?institution_id=none', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log('API Status 200 OK');
    console.log('Returned staff count:', data.staff ? data.staff.length : 'no staff array');
    if (Array.isArray(data.staff)) {
      console.log('Total staff returned:', data.staff.length);
      console.log('All staff list:');
      data.staff.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.role}) - ID: ${s.id}`);
      });
    }
  })
  .catch(err => console.error('Fetch error:', err.message));
