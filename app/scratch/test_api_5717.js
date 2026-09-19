const fs = require('fs');
const jwt = require('jsonwebtoken');

const env = fs.readFileSync('d:/edubird/.env', 'utf8');
const match = env.match(/JWT_SECRET=["']?([^"'\r\n]+)/);
const secret = match ? match[1] : 'secret';

const payload = {
  id: 5717,
  email: 'deepakdv74@gmail.com',
  name: 'Deepak Yadav',
  primary_role: 'institution_admin',
  role_codes: ['institution_admin'],
  memberships: [
    { institution_id: 162, role_id: 7, role_code: 'institution_admin', is_active: true }
  ]
};

const token = jwt.sign(payload, secret, { expiresIn: '1d' });

async function test() {
  const urlInstAdmin = 'http://localhost:3000/api/admin/staff/performance?timeframe=monthly&institution_id=162&role=Institution Admin';
  const res1 = await fetch(urlInstAdmin, { headers: { Authorization: 'Bearer ' + token } });
  const data1 = await res1.json();
  console.log('Filtered by Institution Admin: count =', data1.employees?.length, data1.employees?.map(e => e.full_name));

  const urlPlatformAdmin = 'http://localhost:3000/api/admin/staff/performance?timeframe=monthly&institution_id=162&role=Platform Admin';
  const res2 = await fetch(urlPlatformAdmin, { headers: { Authorization: 'Bearer ' + token } });
  const data2 = await res2.json();
  console.log('Filtered by Platform Admin: count =', data2.employees?.length, data2.employees?.map(e => e.full_name));
}

test().catch(e => console.error(e));
