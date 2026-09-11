const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { getUsersPaginatedQuery } = require('./lib/queries/user');

async function test() {
  const currentUserId = 5307; // Demo Platform Admin
  const res = await getUsersPaginatedQuery(
    pool,
    currentUserId,
    10,
    0,
    null, // institutionIds = null for platform admin
    {
      isPlatformAdminViewer: true,
      includeCurrentUser: true,
      includePlatformAdmins: true,
    }
  );
  console.log('Total count:', res.totalCount);
  console.log('Users returned:', res.users.map(u => ({ id: u.id, name: u.full_name, email: u.email, roles: u.roles })));
  pool.end();
}
test().catch(e => { console.error(e); pool.end(); });
