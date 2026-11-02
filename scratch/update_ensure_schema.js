const fs = require('fs');
let code = fs.readFileSync('lib/db/ensure-feature-schema.ts', 'utf8');

const target = `ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS agreement_document_name VARCHAR(255);`;
const addition = `ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS agreement_document_name VARCHAR(255);
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS invoices JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS extra_cost NUMERIC DEFAULT 0;`;

if (code.includes(target) && !code.includes('invoices JSONB')) {
  code = code.replace(target, addition);
  fs.writeFileSync('lib/db/ensure-feature-schema.ts', code, 'utf8');
  console.log("Updated lib/db/ensure-feature-schema.ts");
} else {
  console.log("Already updated or target not found");
}

