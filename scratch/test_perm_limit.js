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

      const permReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/access/options?type=permissions&limit=2000',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (res2) => {
        let data2 = '';
        res2.on('data', c => data2 += c);
        res2.on('end', () => {
          console.log('API status:', res2.statusCode);
          try {
            const j2 = JSON.parse(data2);
            console.log('Permissions count returned:', j2.data?.length);
            console.log('hasMore:', j2.hasMore);
          } catch (e) {
            console.error('Failed to parse:', data2.slice(0, 200));
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
