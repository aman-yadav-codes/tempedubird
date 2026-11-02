const fs = require('fs');

let code = fs.readFileSync('app/lib/task-attendance-sync.ts', 'utf8');

// 1. Remove the import of performance-engine
code = code.replace(
  /import\s*\{\s*recordPerformancePoints\s*\}\s*from\s*["']@\/lib\/performance\/performance-engine["'];?\r?\n?/,
  ''
);

// 2. Remove syncTaskAttendanceToDatabase function
const startPattern = /\/\*\*[\s\S]*?\*\/\s*export async function syncTaskAttendanceToDatabase[\s\S]*?\n\}\r?\n/;
if (startPattern.test(code)) {
  code = code.replace(startPattern, '\n');
  console.log("Removed syncTaskAttendanceToDatabase function from client-side task-attendance-sync.ts!");
} else {
  console.log("Could not find syncTaskAttendanceToDatabase with regex!");
}

fs.writeFileSync('app/lib/task-attendance-sync.ts', code, 'utf8');
console.log("task-attendance-sync.ts cleaned successfully!");

