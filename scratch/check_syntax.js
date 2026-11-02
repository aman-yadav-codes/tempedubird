const ts = require('typescript');
const fs = require('fs');

const files = [
  'app/admin/operations/tasks/page.tsx',
  'app/admin/operations/tasks/project-invoices-dialog.tsx',
  'app/admin/operations/tasks/project-breakdown-dialog.tsx',
  'app/admin/operations/tasks/subtask-upload-dialog.tsx',
  'app/admin/operations/tasks/subtask-work-update-dialog.tsx',
  'app/admin/operations/tasks/task-history-dialog.tsx',
  'app/api/admin/operations/tasks/invoices/route.ts',
  'app/api/admin/operations/tasks/route.ts'
];

let hasErrors = false;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const diagnostics = sourceFile.parseDiagnostics;
  if (diagnostics.length > 0) {
    hasErrors = true;
    console.error(`Syntax errors in ${file}:`);
    diagnostics.forEach(d => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
      console.error(`  Line ${line + 1}:${character + 1} - ${d.messageText}`);
    });
  } else {
    console.log(`✓ ${file} parsed cleanly with zero syntax errors.`);
  }
});

if (!hasErrors) {
  console.log("All modified files have ZERO syntax/parsing errors!");
}
