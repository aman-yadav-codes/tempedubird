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

      // 1. Test GET /api/admin/access/options?type=permissions
      const permReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/access/options?type=permissions&sync=1',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', c => data2 += c);
        res2.on('end', () => {
          console.log('Permissions options API status:', res2.statusCode);
          try {
            const j2 = JSON.parse(data2);
            console.log('Permissions returned count:', j2.data ? j2.data.length : 'no data');
            console.log('Sample permissions:', j2.data?.slice(0, 5));
          } catch (e) {
            console.error('Failed to parse response:', data2.slice(0, 300));
          }
        });
      });
      permReq.end();
    });
  });
  loginReq.write(postData);
  loginReq.end();
}
test().catch(console.error);
