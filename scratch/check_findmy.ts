import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../lib/db/db');
  const instRes = await db.query(`SELECT id, name, code FROM institutions WHERE name ILIKE '%Findmy%' OR code ILIKE '%Findmy%'`);
  console.log('Institutions:', instRes.rows);

  const taskRes = await db.query(`SELECT id, task_name, institution_id, created_by FROM operations_tasks WHERE task_name ILIKE '%Findmy%' LIMIT 5`);
  console.log('Tasks with Findmy:', taskRes.rows);

  if (instRes.rows.length > 0) {
    const instId = instRes.rows[0].id;
    const staffRes = await db.query(`
      SELECT u.id, u.name, u.email, up.under_institution_id
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE up.under_institution_id = $1
    `, [instId]);
    console.log(`Staff belonging to institution ${instId} (${instRes.rows[0].name}):`, staffRes.rows);
  }
}

main().catch(console.error).finally(() => process.exit(0));
