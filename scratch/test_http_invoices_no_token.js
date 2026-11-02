require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log('Fetching invoices without token for task 6...');
  const res = await fetch('http://localhost:3000/api/admin/operations/tasks/invoices?task_id=6');

  console.log('Status:', res.status, res.statusText);
  const data = await res.json();
  console.log('Data:', data);
}

test().catch(console.error);
