const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const { Pool } = require('pg');
const pool = new Pool({ connectionString: match[1] });

async function main() {
  const idOrSlug = 'maa-sharda-institute-pvt-ltd-1';
  const str = String(idOrSlug).trim();
  const m = str.match(/^(\d+)(?:-(.*))?$/);
  const instIdNum = m ? parseInt(m[1], 10) : (isNaN(parseInt(str, 10)) ? 0 : parseInt(str, 10));

  console.log('instIdNum:', instIdNum);

  // 1. Fetch Profile First
  const profileRes = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.is_active,
      it.name AS type_name,
      ist.name AS subtype_name,
      l.name AS location_name,
      b.name AS board_name,
      pu.name AS parent_university_name
    FROM institution_profiles p
    LEFT JOIN institution_types it ON it.id = p.institution_type_id
    LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
    LEFT JOIN locations l ON l.id = p.location_id
    LEFT JOIN boards b ON b.id = p.board_id
    LEFT JOIN institution_profiles pu ON pu.id = p.parent_university_id
    WHERE (p.id = $1 OR p.slug = $2)
      AND COALESCE(p.is_deleted, FALSE) = FALSE
    LIMIT 1
    `,
    [instIdNum || -1, idOrSlug]
  );

  console.log('Profile result count:', profileRes.rows.length);
  if (profileRes.rows.length > 0) {
    console.log('Profile:', profileRes.rows[0]);
  }

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });

