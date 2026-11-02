import fs from 'fs';

const filePath = 'app/lib/task-attendance-sync.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    // Ensure valid effective institution ID
    let effectiveInstId = institutionId;
    if (!effectiveInstId) {
      const uRes = await dbInstance.query(\`SELECT institution_id FROM users WHERE id = $1\`, [staffUserId]).catch(() => ({ rows: [] }));
      effectiveInstId = uRes.rows[0]?.institution_id || 1;
    }`;

const replacement = `    // Ensure valid effective institution ID
    let effectiveInstId = institutionId;
    if (!effectiveInstId) {
      const mRes = await dbInstance.query(
        \`SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND is_active = TRUE ORDER BY id DESC LIMIT 1\`,
        [staffUserId]
      ).catch(() => ({ rows: [] }));
      effectiveInstId = mRes.rows[0]?.institution_id || 1;
    }`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const newContent = normContent.replace(normTarget, normReplacement);
  const finalContent = content.includes('\r\n') ? newContent.replace(/\n/g, '\r\n') : newContent;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('Fixed institution_memberships query in task-attendance-sync.ts');
} else {
  console.log('Target not found');
}

