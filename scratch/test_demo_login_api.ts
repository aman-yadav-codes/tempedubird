process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDemoLogin() {
  const { POST } = await import('../app/api/auth/demo-login/route');

  console.log('Testing demo login: role = professional');
  const req = new Request('http://localhost:3000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'professional' }),
  });

  const res = await POST(req);
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response JSON:', {
    user_id: json.user?.id,
    email: json.user?.email,
    role_codes: json.user?.role_codes,
    primary_role: json.user?.primary_role,
    redirectTo: json.redirectTo,
    error: json.error,
  });

  process.exit(0);
}

testDemoLogin().catch((e) => {
  console.error('Error testing demo login:', e);
  process.exit(1);
});

