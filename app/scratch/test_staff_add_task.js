const fs = require('fs');
const jwt = require('jsonwebtoken');

const env = fs.readFileSync('d:/edubird/.env', 'utf8');
const match = env.match(/JWT_SECRET=["']?([^"'\r\n]+)/);
const secret = match ? match[1] : 'secret';

// Staff user Deepak Yadav (id: 5717)
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
  const postRes = await fetch('http://localhost:3000/api/admin/operations/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify({
      title: 'Weekly Syllabus Audit and Course Progress Review',
      details: 'Audit computer science curriculum completion for Q3 batch.',
      urgency: 'high',
      estimated_hours: 6,
      institution_id: 162
    })
  });

  const postData = await postRes.json();
  console.log('Task Created Status:', postRes.status);
  console.log('Created Task Assignee ID:', postData.task?.assigned_employee_id);
  console.log('Created Task Assignee Name:', postData.task?.assigned_employee_name);
  console.log('Created Task ID:', postData.task?.id);

  // Now verify staff performance API reflects this task
  const perfRes = await fetch('http://localhost:3000/api/admin/staff/performance?timeframe=monthly&institution_id=162', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const perfData = await perfRes.json();
  const deepak = perfData.employees?.find(e => e.employee_id === 5717);
  console.log('Deepak Yadav Tasks Count in Performance:', deepak?.tasks_assigned_count);
}

test().catch(e => console.error(e));
