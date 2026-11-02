import fs from 'fs';

const filePath = 'app/lib/task-attendance-sync.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `  const checkInCount = starts.length;
  const earliestStart = starts.length > 0 ? Math.min(...starts) : null;
  const latestStop = stops.length > 0 ? Math.max(...stops) : null;

  let workingMinutes = 0;
  if (earliestStart !== null) {
    if (latestStop !== null && latestStop >= earliestStart) {
      // Whole day working hours span from first start to last stop
      workingMinutes = Math.max(1, Math.round((latestStop - earliestStart) / (1000 * 60)));
    } else if (isTargetToday) {
      workingMinutes = Math.max(1, Math.round((nowMs - earliestStart) / (1000 * 60)));
    }
  }

  let taskMinutes = Math.round(totalActiveTaskSeconds / 60);
  if (taskMinutes > workingMinutes && workingMinutes > 0) {
    taskMinutes = workingMinutes;
  }
  if (taskMinutes === 0 && workingMinutes > 0 && checkInCount > 0) {
    taskMinutes = workingMinutes;
  }

  const workingHours = Math.round((workingMinutes / 60) * 100) / 100;
  const taskHours = Math.round((taskMinutes / 60) * 100) / 100;`;

const replacement = `  const checkInCount = starts.length;
  const earliestStart = starts.length > 0 ? Math.min(...starts) : null;
  let latestStop = stops.length > 0 ? Math.max(...stops) : null;

  if (hasActiveTask && isTargetToday) {
    latestStop = Math.max(latestStop || 0, nowMs);
  }

  // Calculate total working minutes
  // As requested: Staff total working hours is the sum of working hours of all tasks worked on that day
  let taskMinutes = Math.round(totalActiveTaskSeconds / 60);
  let workingMinutes = taskMinutes;

  // Fallback for legacy tasks with start/stop timestamps but without granular history sessions
  if (workingMinutes === 0 && earliestStart !== null) {
    if (latestStop !== null && latestStop >= earliestStart) {
      workingMinutes = Math.max(1, Math.round((latestStop - earliestStart) / (1000 * 60)));
    } else if (isTargetToday) {
      workingMinutes = Math.max(1, Math.round((nowMs - earliestStart) / (1000 * 60)));
    }
    taskMinutes = workingMinutes;
  }

  const workingHours = Math.round((workingMinutes / 60) * 100) / 100;
  const taskHours = Math.round((taskMinutes / 60) * 100) / 100;`;

// Normalize CRLF to LF for matching
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const newContent = normContent.replace(normTarget, normReplacement);
  const finalContent = content.includes('\r\n') ? newContent.replace(/\n/g, '\r\n') : newContent;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('SUCCESSFULLY REPLACED IN task-attendance-sync.ts');
} else {
  console.log('TARGET NOT FOUND');
}
