const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

// 1. Add status helper functions
const helpers = `
export function getUploadStatusSelectClass(status?: string) {
  switch (status) {
    case "completed":
    case "passed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25";
    case "failed":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/25";
    case "stuck":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40 hover:bg-orange-500/25";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 hover:bg-blue-500/25";
    case "ready_for_testing":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500/25";
    case "awaiting_confirmation":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25";
    case "pending":
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25";
  }
}

export function getUploadStatusBadgeClass(status?: string) {
  switch (status) {
    case "completed":
    case "passed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "failed":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "stuck":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "ready_for_testing":
      return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    case "awaiting_confirmation":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    case "pending":
    default:
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
}

export function formatUploadStatusLabel(status?: string) {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "ready_for_testing":
      return "Ready for testing";
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "stuck":
      return "Stuck";
    case "awaiting_confirmation":
      return "Awaiting confirmation";
    case "completed":
      return "Completed";
    case "pending":
    default:
      return "Pending";
  }
}
`;

if (!content.includes('getUploadStatusSelectClass')) {
  content = content.replace('type Props = {', helpers + '\ntype Props = {');
}

// 2. Replace the <select ...> in file list
const oldSelectPattern = /<select\s+value=\{fileStatus\}[\s\S]*?<\/select>/;
const newSelectJsx = `<select
                            value={fileStatus}
                            onChange={(e) => handleUploadStatusChange(upl.id, e.target.value)}
                            disabled={saving}
                            className={\`h-7 text-xs font-bold rounded-md border px-2 outline-none cursor-pointer shadow-2xs transition-colors \${getUploadStatusSelectClass(fileStatus)}\`}
                            title="Deliverable verification status"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="ready_for_testing">Ready for testing</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="stuck">Stuck</option>
                            <option value="awaiting_confirmation">Awaiting confirmation</option>
                            {fileStatus === "completed" && <option value="completed">Completed</option>}
                          </select>`;

if (oldSelectPattern.test(content)) {
  content = content.replace(oldSelectPattern, newSelectJsx);
  console.log('Replaced select dropdown with all status options!');
} else {
  console.error('Select pattern not matched!');
  process.exit(1);
}

// 3. Update sidebar activeFile status badge
const sidebarBadgePattern = /<Badge\s+variant="outline"\s+className=\{`text-\[10px\] font-bold uppercase \$\{[\s\S]*?\}\`\}\s*>\s*\{activeFile\.status \|\| "pending"\}\s*<\/Badge>/;
const newSidebarBadgeJsx = `<Badge
                variant="outline"
                className={\`text-[10px] font-bold uppercase \${getUploadStatusBadgeClass(activeFile.status)}\`}
              >
                {formatUploadStatusLabel(activeFile.status)}
              </Badge>`;

if (sidebarBadgePattern.test(content)) {
  content = content.replace(sidebarBadgePattern, newSidebarBadgeJsx);
  console.log('Updated sidebar activeFile status badge!');
}

// 4. Update timeline history entry badge
const historyBadgePattern = /<Badge\s+variant="secondary"\s+className=\{`text-\[9px\] px-1\.5 py-0 font-bold capitalize \$\{[\s\S]*?\}\`\}\s*>\s*\{entry\.status\}\s*<\/Badge>/;
const newHistoryBadgeJsx = `<Badge
                                  variant="secondary"
                                  className={\`text-[9px] px-1.5 py-0 font-bold capitalize \${getUploadStatusBadgeClass(entry.status)}\`}
                                >
                                  {formatUploadStatusLabel(entry.status)}
                                </Badge>`;

if (historyBadgePattern.test(content)) {
  content = content.replace(historyBadgePattern, newHistoryBadgeJsx);
  console.log('Updated timeline history badge!');
}

fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');
console.log('Successfully updated subtask-upload-dialog.tsx!');

