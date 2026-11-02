const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// 1. Imports
if (!code.includes('SubTaskUploadDialog')) {
  code = code.replace(
    'import { ProjectBreakdownDialog } from "./project-breakdown-dialog";',
    `import { ProjectBreakdownDialog } from "./project-breakdown-dialog";
import { SubTaskUploadDialog } from "./subtask-upload-dialog";
import { SubTaskWorkUpdateDialog } from "./subtask-work-update-dialog";`
  );
}

// 2. Add MessageSquare to lucide imports if missing
if (!code.includes('MessageSquare,')) {
  code = code.replace('  History,', '  History,\n  MessageSquare,');
}

// 3. Update SubTask type
const oldSubTaskType = `export type SubTask = {
  id: string;
  title: string;
  price: number; // Task Cost / Price (₹)`;

const newSubTaskType = `export type SubTask = {
  id: string;
  title: string;
  price: number; // Task Cost / Price (₹)
  cadence?: "once" | "daily" | "weekly" | "monthly";
  uploads?: any[];
  work_updates?: any[];`;

if (code.includes(oldSubTaskType)) {
  code = code.replace(oldSubTaskType, newSubTaskType);
}

// 4. Update subtaskAssigneeOptions to show ALL staff
const oldAssigneeOptions = `  // When a main task is created/assigned with specific members, only those members appear in subtasks
  const subtaskAssigneeOptions = useMemo(() => {
    if (!selectedTaskForSubtasks) return uniqueModalStaffList;

    // 1. Check if the project has assigned employees array
    if (
      Array.isArray(selectedTaskForSubtasks.assigned_employees) &&
      selectedTaskForSubtasks.assigned_employees.length > 0
    ) {
      return selectedTaskForSubtasks.assigned_employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role || "Staff Member",
        email: emp.email || null,
      }));
    }

    // 2. Check if the project has a single assigned employee
    if (selectedTaskForSubtasks.assigned_employee_id) {
      return [
        {
          id: selectedTaskForSubtasks.assigned_employee_id,
          name: selectedTaskForSubtasks.assigned_employee_name || "Assigned Staff",
          role: selectedTaskForSubtasks.assigned_employee_role || "Staff Member",
          email: selectedTaskForSubtasks.assigned_employee_email || null,
        },
      ];
    }

    // 3. Fallback to all modal staff if project was left unassigned
    return uniqueModalStaffList;
  }, [selectedTaskForSubtasks, uniqueModalStaffList]);`;

const newAssigneeOptions = `  // Always show all staff for the relevant organization/scope (Platform admin -> all platform staff, Institute admin -> all institute staff)
  const subtaskAssigneeOptions = useMemo(() => {
    const allStaff = dialogStaffList.length > 0 ? dialogStaffList : uniqueModalStaffList;
    return allStaff;
  }, [dialogStaffList, uniqueModalStaffList]);`;

if (code.includes(oldAssigneeOptions)) {
  code = code.replace(oldAssigneeOptions, newAssigneeOptions);
  console.log("Updated subtaskAssigneeOptions to show ALL staff");
} else {
  code = code.replace(oldAssigneeOptions.replace(/\n/g, '\r\n'), newAssigneeOptions.replace(/\n/g, '\r\n'));
  console.log("Updated subtaskAssigneeOptions (CRLF)");
}

// 5. Add new states for upload, work update, and subtask history filter
const oldStates = `  const [breakdownModalTask, setBreakdownModalTask] = useState<OperationTask | null>(null);`;
const newStates = `  const [breakdownModalTask, setBreakdownModalTask] = useState<OperationTask | null>(null);

  // Subtask Action Popups: Upload task, Update work, Subtask History
  const [uploadModalState, setUploadModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);
  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);
  const [subtaskHistoryFilter, setSubtaskHistoryFilter] = useState<{ subtaskId?: string | null; subtaskTitle?: string | null }>({});

  // Subtask Cadence: Once / Daily / Weekly / Monthly
  const [newSubCadence, setNewSubCadence] = useState<"once" | "daily" | "weekly" | "monthly">("once");`;

if (code.includes(oldStates) && !code.includes('uploadModalState')) {
  code = code.replace(oldStates, newStates);
  console.log("Added uploadModalState, workUpdateModalState, subtaskHistoryFilter");
}

// 6. In Modal 2: Update Frequency & Cadence selector to 4 options (Once, Daily, Weekly, Monthly)
const oldCadenceUi = `              {/* Row 2: Task Frequency & Cadence: Daily Basis vs Once */}
              <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Task Frequency & Cadence *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Daily vs One-Time</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSubIsDailyRecurring(false)}
                    className={\`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                      !newSubIsDailyRecurring
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                    }\`}
                  >
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">⚡ Once (One-Time)</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">Standard single deliverable with deadline</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSubIsDailyRecurring(true)}
                    className={\`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                      newSubIsDailyRecurring
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                    }\`}
                  >
                    <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">🔁 Daily Basis</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">Repeats everyday at exact time</div>
                    </div>
                  </button>
                </div>
              </div>`;

const newCadenceUi = `              {/* Row 2: Task Frequency & Cadence: Once / Daily / Weekly / Monthly */}
              <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Task Frequency & Cadence *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Once / Daily / Weekly / Monthly</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSubCadence("once");
                      setNewSubIsDailyRecurring(false);
                    }}
                    className={\`p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                      newSubCadence === "once" && !newSubIsDailyRecurring
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                    }\`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Once
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Single deadline</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewSubCadence("daily");
                      setNewSubIsDailyRecurring(true);
                    }}
                    className={\`p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                      newSubCadence === "daily" || newSubIsDailyRecurring
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                    }\`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Daily
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Repeats everyday</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewSubCadence("weekly");
                      setNewSubIsDailyRecurring(false);
                    }}
                    className={\`p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                      newSubCadence === "weekly"
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                    }\`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Weekly
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Repeats every week</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewSubCadence("monthly");
                      setNewSubIsDailyRecurring(false);
                    }}
                    className={\`p-2.5 rounded-lg border text-left transition-all cursor-pointer \${
                      newSubCadence === "monthly"
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                    }\`}
                  >
                    <div className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" /> Monthly
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">Repeats every month</div>
                  </button>
                </div>
              </div>`;

if (code.includes(oldCadenceUi)) {
  code = code.replace(oldCadenceUi, newCadenceUi);
  console.log("Updated Cadence UI in Modal 2");
} else {
  code = code.replace(oldCadenceUi.replace(/\n/g, '\r\n'), newCadenceUi.replace(/\n/g, '\r\n'));
  console.log("Updated Cadence UI in Modal 2 (CRLF)");
}

// 7. Update Subtask Card on Board:
// Top-right of subtask: Add History button!
const oldSubtaskTopRight = `                              <div className="flex items-center gap-1.5 shrink-0">
                                {getUrgencyBadge(sub.urgency)}
                                {canEditOrRemove && (`;

const newSubtaskTopRight = `                              <div className="flex items-center gap-1.5 shrink-0">
                                {getUrgencyBadge(sub.urgency)}

                                {/* History button for this subtask */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setHistoryModalTask(task);
                                    setSubtaskHistoryFilter({ subtaskId: sub.id, subtaskTitle: sub.title });
                                  }}
                                  className="h-6 text-[10px] font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer px-2 border-border/80"
                                  title="View audit history for this subtask"
                                >
                                  <History className="w-3 h-3 text-primary" /> History
                                </Button>

                                {canEditOrRemove && (`;

if (code.includes(oldSubtaskTopRight)) {
  code = code.replace(oldSubtaskTopRight, newSubtaskTopRight);
  console.log("Added History button to Subtask Card");
} else {
  code = code.replace(oldSubtaskTopRight.replace(/\n/g, '\r\n'), newSubtaskTopRight.replace(/\n/g, '\r\n'));
  console.log("Added History button to Subtask Card (CRLF)");
}

// 8. Update Subtask Card Bottom: Add [Upload task] and [Update work] buttons!
const oldSubtaskBottom = `                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">Status:</span>
                                <select
                                  value={sub.status || "pending"}
                                  onChange={(e) => handleSubTaskStatusDirectUpdate(task, sub.id, e.target.value)}
                                  className="h-6 text-[10px] font-semibold w-28 bg-muted/20 rounded border border-input px-1.5 outline-none cursor-pointer text-foreground"
                                >
                                  {allowedStatuses.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>`;

const newSubtaskBottom = `                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">Status:</span>
                                <select
                                  value={sub.status || "pending"}
                                  onChange={(e) => handleSubTaskStatusDirectUpdate(task, sub.id, e.target.value)}
                                  className="h-6 text-[10px] font-semibold w-28 bg-muted/20 rounded border border-input px-1.5 outline-none cursor-pointer text-foreground"
                                >
                                  {allowedStatuses.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>

                                {/* Button 1: Upload task */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setUploadModalState({ task, subtask: sub })}
                                  className="h-6 text-[10px] font-bold gap-1 text-primary hover:bg-primary/10 border-primary/30 px-2 cursor-pointer shadow-2xs"
                                  title="Upload or view task files (PDF, Word, Images)"
                                >
                                  <Upload className="w-3 h-3" /> Upload task
                                  {Array.isArray((sub as any).uploads) && (sub as any).uploads.length > 0 && (
                                    <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono ml-0.5">
                                      {(sub as any).uploads.length}
                                    </Badge>
                                  )}
                                </Button>

                                {/* Button 2: Update work */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setWorkUpdateModalState({ task, subtask: sub })}
                                  className="h-6 text-[10px] font-bold gap-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border-emerald-400/40 px-2 cursor-pointer shadow-2xs"
                                  title="Post work progress updates & attachments"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-600" /> Update work
                                  {Array.isArray((sub as any).work_updates) && (sub as any).work_updates.length > 0 && (
                                    <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono ml-0.5">
                                      {(sub as any).work_updates.length}
                                    </Badge>
                                  )}
                                </Button>
                              </div>`;

if (code.includes(oldSubtaskBottom)) {
  code = code.replace(oldSubtaskBottom, newSubtaskBottom);
  console.log("Added Upload task and Update work buttons to Subtask Card");
} else {
  code = code.replace(oldSubtaskBottom.replace(/\n/g, '\r\n'), newSubtaskBottom.replace(/\n/g, '\r\n'));
  console.log("Added Upload task and Update work buttons to Subtask Card (CRLF)");
}

// 9. Update TaskHistoryDialog call in JSX to pass subtaskHistoryFilter
const oldHistDialog = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        task={historyModalTask}
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => !open && setHistoryModalTask(null)}
      />`;

const newHistDialog = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        task={historyModalTask}
        open={Boolean(historyModalTask)}
        filterSubtaskId={subtaskHistoryFilter.subtaskId}
        filterSubtaskTitle={subtaskHistoryFilter.subtaskTitle}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryModalTask(null);
            setSubtaskHistoryFilter({});
          }
        }}
      />

      {/* Sub-Task Upload Dialog (PDF, Word, Images with access control) */}
      <SubTaskUploadDialog
        open={Boolean(uploadModalState)}
        onOpenChange={(open) => !open && setUploadModalState(null)}
        task={uploadModalState?.task || null}
        subtask={uploadModalState?.subtask || null}
        onSaved={fetchTasks}
      />

      {/* Sub-Task Work Update Dialog (Post work updates with attachments & timestamps) */}
      <SubTaskWorkUpdateDialog
        open={Boolean(workUpdateModalState)}
        onOpenChange={(open) => !open && setWorkUpdateModalState(null)}
        task={workUpdateModalState?.task || null}
        subtask={workUpdateModalState?.subtask || null}
        onSaved={fetchTasks}
      />`;

if (code.includes(oldHistDialog)) {
  code = code.replace(oldHistDialog, newHistDialog);
  console.log("Rendered SubTaskUploadDialog and SubTaskWorkUpdateDialog");
} else {
  code = code.replace(oldHistDialog.replace(/\n/g, '\r\n'), newHistDialog.replace(/\n/g, '\r\n'));
  console.log("Rendered SubTaskUploadDialog and SubTaskWorkUpdateDialog (CRLF)");
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log("Finished updating app/admin/operations/tasks/page.tsx!");

