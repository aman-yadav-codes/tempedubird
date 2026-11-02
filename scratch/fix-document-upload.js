const fs = require('fs');

const filePath = 'components/shared/document-file-upload.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = 'const isImage = (file: UploadedDocumentFile) => file.fileType.startsWith("image/") || file.url;';
const replacement = 'const isImage = (file: UploadedDocumentFile) => Boolean((file.fileType && file.fileType.startsWith("image/")) || (file.url && /\\.(jpg|jpeg|png|webp|gif|svg|avif)($|\\?)/i.test(file.url)));';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated isImage in', filePath);
} else {
  console.log('Target not found in', filePath);
}

