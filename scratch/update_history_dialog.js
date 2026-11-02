const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/task-history-dialog.tsx', 'utf8');

// 1. Add MessageSquare, Upload, Trash2, UserCheck to lucide imports
if (!code.includes('MessageSquare,')) {
  code = code.replace(
    '  Sparkles,',
    '  Sparkles,\n  MessageSquare,\n  Upload,\n  Trash2,\n  UserCheck,'
  );
}

// 2. Add filterSubtaskId and filterSubtaskTitle to TaskHistoryDialogProps
code = code.replace(
  'interface TaskHistoryDialogProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  task: any | null;\n}',
  `interface TaskHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null;
  filterSubtaskId?: string | null;
  filterSubtaskTitle?: string | null;
}`
);

// 3. Update component signature and add filter state
const oldSig = `export function TaskHistoryDialog({ open, onOpenChange, task }: TaskHistoryDialogProps) {`;
const newSig = `export function TaskHistoryDialog({
  open,
  onOpenChange,
  task,
  filterSubtaskId,
  filterSubtaskTitle,
}: TaskHistoryDialogProps) {
  const [activeSubFilter, setActiveSubFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    setActiveSubFilter(filterSubtaskId || null);
  }, [filterSubtaskId, open]);`;

code = code.replace(oldSig, newSig);

// 4. Update getActionBadge to handle task_file_uploaded, work_updated, assigned, etc.
const oldBadgeSwitch = `      case "modified":
        return (
          <Badge variant="outline" className="border-indigo-500 text-indigo-700 dark:text-indigo-300 gap-1 text-[10px] font-bold">
            Modified
          </Badge>
        );`;

const newBadgeSwitch = `      case "modified":
        return (
          <Badge variant="outline" className="border-indigo-500 text-indigo-700 dark:text-indigo-300 gap-1 text-[10px] font-bold">
            Modified
          </Badge>
        );
      case "task_file_uploaded":
        return (
          <Badge className="bg-blue-600 text-white gap-1 text-[10px] font-bold">
            <Upload className="w-2.5 h-2.5" /> File Uploaded
          </Badge>
        );
      case "task_file_deleted":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400 gap-1 text-[10px] font-bold">
            <Trash2 className="w-2.5 h-2.5" /> File Deleted
          </Badge>
        );
      case "work_updated":
        return (
          <Badge className="bg-emerald-600 text-white gap-1 text-[10px] font-bold">
            <MessageSquare className="w-2.5 h-2.5" /> Work Updated
          </Badge>
        );
      case "assigned":
        return (
          <Badge className="bg-purple-600 text-white gap-1 text-[10px] font-bold">
            <UserCheck className="w-2.5 h-2.5" /> Assigned
          </Badge>
        );`;

code = code.replace(oldBadgeSwitch, newBadgeSwitch);

// 5. Filter displayEvents if activeSubFilter is present
const oldSort = `  // Sort newest first
  displayEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());`;

const newSort = `  // Filter by subtask if requested
  const filteredEvents = activeSubFilter
    ? displayEvents.filter((e) => String(e.subtask_id) === String(activeSubFilter))
    : displayEvents;

  // Sort newest first
  filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());`;

code = code.replace(oldSort, newSort);

// 6. Replace displayEvents.map with filteredEvents.map
code = code.replace('displayEvents.map((evt', 'filteredEvents.map((evt');
code = code.replace('displayEvents.length === 0', 'filteredEvents.length === 0');

fs.writeFileSync('app/admin/operations/tasks/task-history-dialog.tsx', code, 'utf8');
console.log("Updated TaskHistoryDialog successfully!");

