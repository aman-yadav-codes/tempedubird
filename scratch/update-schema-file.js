const fs = require('fs');

const filePath = 'lib/db/ensure-feature-schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = "ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;";
const addition = `
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_for VARCHAR(50) DEFAULT 'own_company';
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT 'EduBird';
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS live_url TEXT;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS demo_url TEXT;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_leader_id INTEGER;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS project_leader_name VARCHAR(255);
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS agreement_document_url TEXT;
      ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS agreement_document_name VARCHAR(255);`;

if (content.includes(target) && !content.includes('project_for VARCHAR(50)')) {
  content = content.replace(target, target + addition);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated ensure-feature-schema.ts');
} else {
  console.log('Already added or target not found');
}

