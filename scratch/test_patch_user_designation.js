process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ sub: '1', id: 1, email: 'admin@gmail.com', typ: 'access' }, secret, { expiresIn: '1h' });

async function testWithNonTeacher() {
  try {
    // Role 9 is Driver or Role 11 is Faculty or other role
    const getRes = await fetch('http://localhost:3000/api/admin/users/89', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const getUser = await getRes.json();

    // Change designation to 3 (CEO)
    const payload = {
      email: getUser.data.email,
      full_name: getUser.data.full_name,
      role_id: getUser.data.role_id,
      phone: getUser.data.phone,
      is_active: getUser.data.is_active,
      teaching_categories: [],
      teaching_subjects: [],
      profile: {
        ...getUser.data.profile,
        designation_id: 3 // CEO
      }
    };

    const patchRes = await fetch('http://localhost:3000/api/admin/users/89', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const patchData = await patchRes.json();
    console.log('PATCH /api/admin/users/89 status:', patchRes.status);
    console.log('New designation_name:', patchData?.data?.profile?.designation_name);
    console.log('New designation_id:', patchData?.data?.profile?.designation_id);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testWithNonTeacher();
