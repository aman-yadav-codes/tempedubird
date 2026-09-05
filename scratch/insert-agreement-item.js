const fs = require('fs');
const filePath = 'd:/edubird/app/admin/institutions/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = '<DropdownMenuItem onClick={() => setEditing(item)}>\n                                Edit\n                            </DropdownMenuItem>';
const replacementStr = '<DropdownMenuItem onClick={() => setEditing(item)}>\n                                Edit\n                            </DropdownMenuItem>\n                            <DropdownMenuItem onClick={() => setAgreementTarget(item)}>\n                                Agreement\n                            </DropdownMenuItem>';

if (content.includes('Edit\n                            </DropdownMenuItem>')) {
  content = content.replace(
    'Edit\n                            </DropdownMenuItem>',
    'Edit\n                            </DropdownMenuItem>\n                            <DropdownMenuItem onClick={() => setAgreementTarget(item)}>\n                                Agreement\n                            </DropdownMenuItem>'
  );
  console.log('Successfully inserted Agreement dropdown item');
} else {
  console.log('Target not found for dropdown item');
}

fs.writeFileSync(filePath, content, 'utf8');
