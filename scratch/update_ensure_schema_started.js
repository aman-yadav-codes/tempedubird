const fs = require('fs');
let code = fs.readFileSync('lib/db/ensure-feature-schema.ts', 'utf8');

const target = `ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS extra_cost NUMERIC DEFAULT 0;`;
const addition = `ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS extra_cost NUMERIC DEFAULT 0;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`;

if (code.includes(target) && !code.includes('started_at TIMESTAMP')) {
  code = code.replace(target, addition);
  fs.writeFileSync('lib/db/ensure-feature-schema.ts', code, 'utf8');
  console.log("Added started_at, stopped_at, completed_at to lib/db/ensure-feature-schema.ts");
} else {
  console.log("Already added or target not found");
}

