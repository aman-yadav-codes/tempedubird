process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: '1', id: 1, email: 'admin@gmail.com', typ: 'access' }, secret, { expiresIn: '1h' });

async function check() {
  const res1 = await fetch('http://localhost:3000/api/admin/users?staffScope=all', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data1 = await res1.json();
  console.log('Staff list count on /admin/staff:', data1.data ? data1.data.length : 'none');
  if (data1.data) {
    console.log('Staff list users:');
    data1.data.forEach((u, i) => {
      const inst = u.profile?.under_institution_name || u.institutions?.map(x=>x.name).join(', ') || 'No institution';
      console.log(`  ${i+1}. ${u.full_name} (${u.email}) - Role: ${u.roles?.join(', ')} - Inst: ${inst}`);
    });
  }

  const res2 = await fetch('http://localhost:3000/api/admin/operations/tasks?institution_id=none', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data2 = await res2.json();
  console.log('\nTasks route staff count:', data2.staff ? data2.staff.length : 'none');
  if (data2.staff) {
    console.log('Tasks staff list:');
    data2.staff.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name} (${s.email}) - Role: ${s.role}`);
    });
  }
}
check();
