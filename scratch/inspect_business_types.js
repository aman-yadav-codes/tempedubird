const { Pool } = require('pg');
const fs = require('fs');
let envFile = '.env.local';
if (!fs.existsSync(envFile)) envFile = '.env';
const envContent = fs.readFileSync(envFile, 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  const content = fs.readFileSync('components/app-sidebar.tsx', 'utf8');
  const navSection = content.slice(content.indexOf('const navItems: SidebarItem[] = ['), content.indexOf('];\n\nconst platformAdminNavItems'));
  console.log('navSection length:', navSection.length);

  // Let's print the top level items in navItems
  const topLevels = Array.from(navSection.matchAll(/{\s*title:\s*"([^"]+)",\s*url:\s*"([^"]+)"/g)).map(m => ({ title: m[1], url: m[2] }));
  console.log('Top level items in navItems:', topLevels);

  await pool.end();
}
check().catch(console.error);
