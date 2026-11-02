const fs = require('fs');

const filePath = 'app/api/admin/uploads/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `const ACCEPTED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);`;

const replacement = `const ACCEPTED_DOCUMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);`;

content = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (content.includes(normalizedTarget)) {
  content = content.replace(normalizedTarget, replacement);
  content = content.replace(
    'Only JPG, PNG, WebP images and PDF documents are allowed',
    'Only JPG, PNG, WebP images, PDF, and Word (.doc, .docx) documents are allowed'
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated ACCEPTED_DOCUMENT_TYPES in', filePath);
} else {
  console.log('Target not found in', filePath);
}

