const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: '81', id: 81, typ: 'access' }, secret, { expiresIn: '1h' });

async function test() {
  console.log('Fetching invoices with token for task 6...');
  const res = await fetch('http://localhost:3000/api/admin/operations/tasks/invoices?task_id=6', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Data:', data);
}

test().catch(console.error);
