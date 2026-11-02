const fs = require('fs');

let sync = fs.readFileSync('app/lib/task-attendance-sync.ts', 'utf8');
let helper = fs.readFileSync('scratch/append_sessions_helper.ts', 'utf8');

const marker = 'const codeToAppend = `';
const start = helper.indexOf(marker);
const end = helper.lastIndexOf('`;');
const codeToAppend = helper.substring(start + marker.length, end);

if (!sync.includes('export function getDayCheckInSessions')) {
  fs.writeFileSync('app/lib/task-attendance-sync.ts', sync + '\n' + codeToAppend, 'utf8');
  console.log('Appended getDayCheckInSessions successfully!');
} else {
  console.log('Already includes getDayCheckInSessions');
}

