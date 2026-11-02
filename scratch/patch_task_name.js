const fs = require('fs');
let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

const target = 'const taskName = subtask.title || "Deliverable Task";';
const replacement = `const enteredText = uploadNotes.trim();
        if (!enteredText && !selectedFile) {
          toast.error("Please enter a task name or description");
          setUploading(false);
          return;
        }
        const taskName = enteredText ? (enteredText.length > 80 ? enteredText.substring(0, 77) + "..." : enteredText) : (subtask.title || "Deliverable Task");`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');
  console.log('Successfully updated task name logic!');
} else {
  console.error('Target not found!');
}

