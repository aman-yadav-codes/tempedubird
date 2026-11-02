const fs = require('fs');

const filePath = 'components/shared/google-location-picker.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = 'className={isSideBySide ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-start" : "space-y-3"}';
const replacement = 'className={isSideBySide ? "grid grid-cols-1 sm:grid-cols-2 gap-4 items-start" : "space-y-3"}';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated google-location-picker.tsx layout to sm:grid-cols-2');
} else {
  console.log('Target not found in google-location-picker.tsx');
}

