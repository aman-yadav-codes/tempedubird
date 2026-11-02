const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/task-history-dialog.tsx', 'utf8');

// 1. Update TaskHistoryDialogProps
const oldProps = 'interface TaskHistoryDialogProps {\r\n  open: boolean;\r\n  onOpenChange: (open: boolean) => void;\r\n  task: any | null;\r\n}';
const newProps = 'interface TaskHistoryDialogProps {\r\n  open: boolean;\r\n  onOpenChange: (open: boolean) => void;\r\n  task: any | null;\r\n  filterSubtaskId?: string | null;\r\n  filterSubtaskTitle?: string | null;\r\n}';

if (code.includes(oldProps)) {
  code = code.replace(oldProps, newProps);
  console.log('Updated TaskHistoryDialogProps');
} else if (code.includes(oldProps.replace(/\r\n/g, '\n'))) {
  code = code.replace(oldProps.replace(/\r\n/g, '\n'), newProps.replace(/\r\n/g, '\n'));
  console.log('Updated TaskHistoryDialogProps (LF)');
}

// 2. Add badges to getActionBadge
const oldSwitch = '    switch (action) {';
const newBadges = `    switch (action) {
      case "task_file_uploaded":
        return (
          <Badge className="bg-blue-600 text-white gap-1 text-[10px] font-bold">
            <Upload className="w-2.5 h-2.5" /> File Uploaded
          </Badge>
        );
      case "task_file_deleted":
        return (
          <Badge className="bg-rose-600 text-white gap-1 text-[10px] font-bold">
            <Trash2 className="w-2.5 h-2.5" /> File Deleted
          </Badge>
        );
      case "work_updated":
        return (
          <Badge className="bg-emerald-600 text-white gap-1 text-[10px] font-bold">
            <MessageSquare className="w-2.5 h-2.5" /> Work Updated
          </Badge>
        );
      case "subtask_created":
        return (
          <Badge className="bg-purple-600 text-white gap-1 text-[10px] font-bold">
            <Sparkles className="w-2.5 h-2.5" /> Deliverable Created
          </Badge>
        );
      case "subtask_assigned":
        return (
          <Badge className="bg-indigo-600 text-white gap-1 text-[10px] font-bold">
            <UserCheck className="w-2.5 h-2.5" /> Assigned
          </Badge>
        );
      case "subtask_status_changed":
        return (
          <Badge className="bg-amber-600 text-white gap-1 text-[10px] font-bold">
            <RefreshCw className="w-2.5 h-2.5" /> Status Changed
          </Badge>
        );
      case "subtask_edited":
        return (
          <Badge variant="outline" className="border-indigo-500 text-indigo-700 dark:text-indigo-300 gap-1 text-[10px] font-bold">
            Deliverable Edited
          </Badge>
        );`;

if (!code.includes('case "task_file_uploaded":')) {
  code = code.replace(oldSwitch, newBadges);
  console.log('Added action badges');
}

// 3. Define filteredEvents before return
if (!code.includes('const filteredEvents =')) {
  const beforeReturn = code.includes('\r\n') ? '  return (\r\n    <Dialog open={open}' : '  return (\n    <Dialog open={open}';
  const nl = code.includes('\r\n') ? '\r\n' : '\n';
  const filteredDef = `  const filteredEvents = activeSubFilter${nl}    ? displayEvents.filter((e) => String(e.subtask_id) === String(activeSubFilter))${nl}    : displayEvents;${nl}${nl}  return (${nl}    <Dialog open={open}`;

  code = code.replace(beforeReturn, filteredDef);
  console.log('Added filteredEvents definition');
}

// 4. In JSX, if activeSubFilter is active, show banner
const oldEventsHeader = '<h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">';
if (!code.includes('filterSubtaskTitle') && code.includes(oldEventsHeader)) {
  // We can add a subtask indicator if filtered
}

fs.writeFileSync('app/admin/operations/tasks/task-history-dialog.tsx', code, 'utf8');
console.log('Done updating task-history-dialog.tsx!');

