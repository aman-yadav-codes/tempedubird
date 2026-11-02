process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const http = require('http');

async function test() {
  const postData = JSON.stringify({ role: 'platform_admin' });
  const loginReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/demo-login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const json = JSON.parse(data);
      const token = json.accessToken;

      // Test with institution_id=1
      const req1 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/operations/tasks?institution_id=1',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res1) => {
        let d1 = '';
        res1.on('data', c => d1 += c);
        res1.on('end', () => {
          const j1 = JSON.parse(d1);
          console.log('With institution_id=1, staff count:', j1.staff?.length);
          console.log('First 5 staff with inst=1:', j1.staff?.slice(0, 5));
        });
      });
      req1.end();

      // Test with institution_id=none
      const req2 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/operations/tasks?institution_id=none',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          const j2 = JSON.parse(d2);
          console.log('With institution_id=none, staff count:', j2.staff?.length);
        });
      });
      req2.end();
    });
  });
  loginReq.write(postData);
  loginReq.end();
}
test().catch(console.error);
