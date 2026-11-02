const fs = require('fs');
let content = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8');

const targetRegex = /{\/\* \+ Sub-Tasks button \(Image 8\) \*\/}[\s\S]*?<\/Button>\s*/;
if (targetRegex.test(content)) {
  content = content.replace(targetRegex, '');
  fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', content, 'utf8');
  console.log('Successfully removed + Sub-Tasks button from my-profile-client.tsx');
} else {
  console.error('Target button not found in my-profile-client.tsx');
}

