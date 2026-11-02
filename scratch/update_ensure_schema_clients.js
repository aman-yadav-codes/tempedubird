const fs = require('fs');
let code = fs.readFileSync('lib/db/ensure-feature-schema.ts', 'utf8');

const target1 = "ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS assigned_employees JSONB DEFAULT '[]'::jsonb;";
const replace1 = target1 + "\n      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS assigned_clients JSONB DEFAULT '[]'::jsonb;";

if (code.includes(target1)) {
  code = code.replace(target1, replace1);
}

const target2 = "`ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS assigned_employees JSONB DEFAULT '[]'::jsonb`,";
const replace2 = target2 + "\n      `ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS assigned_clients JSONB DEFAULT '[]'::jsonb`,";

if (code.includes(target2)) {
  code = code.replace(target2, replace2);
}

fs.writeFileSync('lib/db/ensure-feature-schema.ts', code, 'utf8');
console.log('Updated ensure-feature-schema.ts successfully!');

