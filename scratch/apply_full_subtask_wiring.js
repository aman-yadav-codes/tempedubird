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
  console.log('Added dialog imports');
}

// 2. Lucide imports: add MessageSquare if missing
if (!code.includes('MessageSquare,')) {
  code = code.replace('  History,', '  History,\n  MessageSquare,');
  console.log('Added MessageSquare to imports');
}

// 3. Update SubTask type
const oldSubTask = `export type SubTask = {
  id: string;
  title: string;
  price: number; // Task Cost / Price (₹)`;

const newSubTask = `export type SubTask = {
  id: string;
  title: string;
  price: number; // Task Cost / Price (₹)
  cadence?: "once" | "daily" | "weekly" | "monthly";
  uploads?: any[];
  work_updates?: any[];`;

if (code.includes(oldSubTask)) {
  code = code.replace(oldSubTask, newSubTask);
  console.log('Updated SubTask type');
} else if (code.includes(oldSubTask.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldSubTask.replace(/\n/g, '\r\n'), newSubTask.replace(/\n/g, '\r\n'));
  console.log('Updated SubTask type (CRLF)');
}

// 4. Update OperationTask type
const oldOpTaskEnd = `  review_submitted_at?: string | null;
  review_submitted_by?: string | null;
  created_at: string;
  updated_at: string;
};`;

const newOpTaskEnd = `  review_submitted_at?: string | null;
  review_submitted_by?: string | null;
  invoices?: any[];
  base_price?: number | null;
  extra_cost?: number | null;
  history?: any[];
  created_at: string;
  updated_at: string;
};`;

if (code.includes(oldOpTaskEnd)) {
  code = code.replace(oldOpTaskEnd, newOpTaskEnd);
  console.log('Updated OperationTask type');
} else if (code.includes(oldOpTaskEnd.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldOpTaskEnd.replace(/\n/g, '\r\n'), newOpTaskEnd.replace(/\n/g, '\r\n'));
  console.log('Updated OperationTask type (CRLF)');
}

// 5. Update subtaskAssigneeOptions to show ALL staff
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
    const allStaff = dialogStaffList.length > 0 ? dialogStaffList : (staffList.length > 0 ? staffList : uniqueModalStaffList);
    return allStaff;
  }, [dialogStaffList, staffList, uniqueModalStaffList]);`;

if (code.includes(oldAssigneeOptions)) {
  code = code.replace(oldAssigneeOptions, newAssigneeOptions);
  console.log('Updated subtaskAssigneeOptions');
} else if (code.includes(oldAssigneeOptions.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldAssigneeOptions.replace(/\n/g, '\r\n'), newAssigneeOptions.replace(/\n/g, '\r\n'));
  console.log('Updated subtaskAssigneeOptions (CRLF)');
}

// 6. Add states for uploadModalState, workUpdateModalState, subtaskHistoryFilter, newSubCadence
const oldBreakdownState = `  const [breakdownModalTask, setBreakdownModalTask] = useState<OperationTask | null>(null);`;
const newSubtaskStates = `  const [breakdownModalTask, setBreakdownModalTask] = useState<OperationTask | null>(null);

  // Subtask Action Popups: Upload task, Update work, Subtask History
  const [uploadModalState, setUploadModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);
  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);
  const [subtaskHistoryFilter, setSubtaskHistoryFilter] = useState<{ subtaskId?: string | null; subtaskTitle?: string | null }>({});

  // Subtask Cadence: Once / Daily / Weekly / Monthly
  const [newSubCadence, setNewSubCadence] = useState<"once" | "daily" | "weekly" | "monthly">("once");`;

if (code.includes(oldBreakdownState) && !code.includes('uploadModalState')) {
  code = code.replace(oldBreakdownState, newSubtaskStates);
  console.log('Added subtask modal states');
}

// 7. Update handleAddSubTaskToList to include cadence and history
const oldNewSub = `    const newSub: SubTask = {
      id: \`sub_\${Date.now()}\`,
      title: newSubTitle.trim(),
      price: Number(newSubPrice) || 0,
      assigned_employee_id: assignedStaff ? assignedStaff.id : null,
      assigned_employee_name: assignedStaff ? assignedStaff.name : null,
      assigned_employee_role: assignedStaff ? assignedStaff.role : null,
      duration_hours: parsedHours,
      duration_minutes: parsedMins,
      points: Number(newSubPoints) || 20,
      penalty_points: Number(newSubPenaltyPoints) || 10,
      deadline_date: newSubIsDailyRecurring ? null : (newSubDeadlineDate || null),
      deadline_time: newSubIsDailyRecurring ? (newSubDailyTime || "10:00") : (newSubDeadlineNumber || "18:00"),
      daily_time: newSubIsDailyRecurring ? (newSubDailyTime || "10:00") : null,
      urgency: newSubUrgency,
      status: "pending",
      is_daily_recurring: newSubIsDailyRecurring,
    };

    const updated = [newSub, ...activeSubTasks];
    setActiveSubTasks(updated);

    const projectMembers = Array.isArray(selectedTaskForSubtasks?.assigned_employees) && selectedTaskForSubtasks.assigned_employees.length > 0
      ? selectedTaskForSubtasks.assigned_employees
      : (selectedTaskForSubtasks?.assigned_employee_id ? [{ id: selectedTaskForSubtasks.assigned_employee_id }] : []);
    resetSubtaskDraft(projectMembers.length === 1 ? String(projectMembers[0].id) : "none");

    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }`;

const newNewSub = `    const newSub: SubTask = {
      id: \`sub_\${Date.now()}\`,
      title: newSubTitle.trim(),
      price: Number(newSubPrice) || 0,
      assigned_employee_id: assignedStaff ? assignedStaff.id : null,
      assigned_employee_name: assignedStaff ? assignedStaff.name : null,
      assigned_employee_role: assignedStaff ? assignedStaff.role : null,
      duration_hours: parsedHours,
      duration_minutes: parsedMins,
      points: Number(newSubPoints) || 20,
      penalty_points: Number(newSubPenaltyPoints) || 10,
      deadline_date: newSubIsDailyRecurring ? null : (newSubDeadlineDate || null),
      deadline_time: newSubIsDailyRecurring ? (newSubDailyTime || "10:00") : (newSubDeadlineNumber || "18:00"),
      daily_time: newSubIsDailyRecurring ? (newSubDailyTime || "10:00") : null,
      urgency: newSubUrgency,
      status: "pending",
      cadence: newSubCadence,
      is_daily_recurring: newSubIsDailyRecurring,
      uploads: [],
      work_updates: [],
    };

    const updated = [newSub, ...activeSubTasks];
    setActiveSubTasks(updated);

    const projectMembers = Array.isArray(selectedTaskForSubtasks?.assigned_employees) && selectedTaskForSubtasks.assigned_employees.length > 0
      ? selectedTaskForSubtasks.assigned_employees
      : (selectedTaskForSubtasks?.assigned_employee_id ? [{ id: selectedTaskForSubtasks.assigned_employee_id }] : []);
    resetSubtaskDraft(projectMembers.length === 1 ? String(projectMembers[0].id) : "none");

    if (selectedTaskForSubtasks) {
      const currentHist = Array.isArray(selectedTaskForSubtasks.history) ? [...selectedTaskForSubtasks.history] : [];
      currentHist.push({
        id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
        action: "subtask_created",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Admin",
        user_role: (user as any)?.role || "Admin",
        subtask_id: newSub.id,
        subtask_title: newSub.title,
        details: \`Deliverable "\${newSub.title}" created\${assignedStaff ? \` and assigned to \${assignedStaff.name}\` : ""}\${newSub.price ? \` with budget ₹\${newSub.price}\` : ""}\`,
      });
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated, currentHist);
    }`;

if (code.includes(oldNewSub)) {
  code = code.replace(oldNewSub, newNewSub);
  console.log('Updated handleAddSubTaskToList');
} else if (code.includes(oldNewSub.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldNewSub.replace(/\n/g, '\r\n'), newNewSub.replace(/\n/g, '\r\n'));
  console.log('Updated handleAddSubTaskToList (CRLF)');
}

// 8. Update saveSubtasksToServer to accept extraHistory
const oldSaveSubtasks = `  // Server sync helper for subtasks
  const saveSubtasksToServer = async (taskId: number, updatedSubs: SubTask[]) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: taskId, sub_tasks: updatedSubs }),
      });`;

const newSaveSubtasks = `  // Server sync helper for subtasks
  const saveSubtasksToServer = async (taskId: number, updatedSubs: SubTask[], extraHistory?: any[]) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const payload: any = { id: taskId, sub_tasks: updatedSubs };
      if (extraHistory && Array.isArray(extraHistory)) {
        payload.history = extraHistory;
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });`;

if (code.includes(oldSaveSubtasks)) {
  code = code.replace(oldSaveSubtasks, newSaveSubtasks);
  console.log('Updated saveSubtasksToServer');
} else if (code.includes(oldSaveSubtasks.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldSaveSubtasks.replace(/\n/g, '\r\n'), newSaveSubtasks.replace(/\n/g, '\r\n'));
  console.log('Updated saveSubtasksToServer (CRLF)');
}

// 9. Update handleSubTaskStatusChangeInModal
const oldModalStatusChange = `  // Change Sub-Task status in Modal 2
  const handleSubTaskStatusChangeInModal = async (subId: string, newStatus: any) => {
    const updated = activeSubTasks.map((s) =>
      s.id === subId ? { ...s, status: newStatus } : s
    );
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }
  };`;

const newModalStatusChange = `  // Change Sub-Task status in Modal 2
  const handleSubTaskStatusChangeInModal = async (subId: string, newStatus: any) => {
    const updated = activeSubTasks.map((s) =>
      s.id === subId ? { ...s, status: newStatus } : s
    );
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      const targetSub = activeSubTasks.find((s) => s.id === subId);
      const currentHist = Array.isArray(selectedTaskForSubtasks.history) ? [...selectedTaskForSubtasks.history] : [];
      currentHist.push({
        id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
        action: "subtask_status_changed",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Admin",
        user_role: (user as any)?.role || "Admin",
        subtask_id: subId,
        subtask_title: targetSub?.title || "Deliverable",
        old_status: targetSub?.status || "pending",
        new_status: newStatus,
        details: \`Status of deliverable "\${targetSub?.title || "Deliverable"}" changed to \${newStatus}\`,
      });
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated, currentHist);
    }
  };`;

if (code.includes(oldModalStatusChange)) {
  code = code.replace(oldModalStatusChange, newModalStatusChange);
  console.log('Updated handleSubTaskStatusChangeInModal');
} else if (code.includes(oldModalStatusChange.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldModalStatusChange.replace(/\n/g, '\r\n'), newModalStatusChange.replace(/\n/g, '\r\n'));
  console.log('Updated handleSubTaskStatusChangeInModal (CRLF)');
}

// 10. Update handleSubTaskAssigneeChangeInModal
const oldModalAssigneeChange = `  // Change Sub-Task assigned staff in Modal 2
  const handleSubTaskAssigneeChangeInModal = async (subId: string, staffIdStr: string) => {
    const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === staffIdStr);
    const updated = activeSubTasks.map((s) =>
      s.id === subId
        ? {
            ...s,
            assigned_employee_id: assignedStaff ? assignedStaff.id : null,
            assigned_employee_name: assignedStaff ? assignedStaff.name : null,
            assigned_employee_role: assignedStaff ? assignedStaff.role : null,
          }
        : s
    );
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }
  };`;

const newModalAssigneeChange = `  // Change Sub-Task assigned staff in Modal 2
  const handleSubTaskAssigneeChangeInModal = async (subId: string, staffIdStr: string) => {
    const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === staffIdStr);
    const updated = activeSubTasks.map((s) =>
      s.id === subId
        ? {
            ...s,
            assigned_employee_id: assignedStaff ? assignedStaff.id : null,
            assigned_employee_name: assignedStaff ? assignedStaff.name : null,
            assigned_employee_role: assignedStaff ? assignedStaff.role : null,
          }
        : s
    );
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      const targetSub = activeSubTasks.find((s) => s.id === subId);
      const currentHist = Array.isArray(selectedTaskForSubtasks.history) ? [...selectedTaskForSubtasks.history] : [];
      currentHist.push({
        id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
        action: "subtask_assigned",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Admin",
        user_role: (user as any)?.role || "Admin",
        subtask_id: subId,
        subtask_title: targetSub?.title || "Deliverable",
        details: assignedStaff
          ? \`Deliverable "\${targetSub?.title || "Deliverable"}" assigned to \${assignedStaff.name}\`
          : \`Deliverable "\${targetSub?.title || "Deliverable"}" assignment cleared\`,
      });
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated, currentHist);
    }
  };`;

if (code.includes(oldModalAssigneeChange)) {
  code = code.replace(oldModalAssigneeChange, newModalAssigneeChange);
  console.log('Updated handleSubTaskAssigneeChangeInModal');
} else if (code.includes(oldModalAssigneeChange.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldModalAssigneeChange.replace(/\n/g, '\r\n'), newModalAssigneeChange.replace(/\n/g, '\r\n'));
  console.log('Updated handleSubTaskAssigneeChangeInModal (CRLF)');
}

// 11. Update handleSaveEditedSubtask to record subtask_edited history
const oldSaveEdited = `    setEditSubtaskDialogOpen(false);
    await saveSubtasksToServer(editingSubtaskTargetTask.id, updatedSubs);
    toast.success("Sub-task updated successfully!");`;

const newSaveEdited = `    setEditSubtaskDialogOpen(false);
    const prevSub = currentSubs.find((s) => s.id === editingSubtaskId);
    const changes: string[] = [];
    if (prevSub) {
      if (prevSub.title !== editSubTitle.trim()) changes.push(\`renamed to "\${editSubTitle.trim()}"\`);
      if (parseFloat(String(prevSub.price)) !== (parseFloat(editSubPrice) || 0)) changes.push(\`price ₹\${parseFloat(editSubPrice) || 0}\`);
      if (String(prevSub.assigned_employee_id || "") !== String(assignedStaff?.id || "")) {
        changes.push(\`assigned to \${assignedStaff ? assignedStaff.name : "Unassigned"}\`);
      }
      if (prevSub.deadline_date !== (!editSubIsDaily ? (editSubDeadlineDate || null) : null) ||
          prevSub.deadline_time !== (!editSubIsDaily ? (editSubDeadlineTime || null) : null)) {
        changes.push(\`deadline \${editSubDeadlineDate || "None"} \${editSubDeadlineTime || ""}\`);
      }
    }
    const currentHist = Array.isArray(editingSubtaskTargetTask.history) ? [...editingSubtaskTargetTask.history] : [];
    if (changes.length > 0) {
      currentHist.push({
        id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
        action: "subtask_edited",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Admin",
        user_role: (user as any)?.role || "Admin",
        subtask_id: editingSubtaskId,
        subtask_title: editSubTitle.trim(),
        details: \`Deliverable updated by \${(user as any)?.full_name || "Admin"}: \${changes.join("; ")}\`,
      });
    }
    await saveSubtasksToServer(editingSubtaskTargetTask.id, updatedSubs, currentHist);
    toast.success("Sub-task updated successfully!");`;

if (code.includes(oldSaveEdited)) {
  code = code.replace(oldSaveEdited, newSaveEdited);
  console.log('Updated handleSaveEditedSubtask');
} else if (code.includes(oldSaveEdited.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldSaveEdited.replace(/\n/g, '\r\n'), newSaveEdited.replace(/\n/g, '\r\n'));
  console.log('Updated handleSaveEditedSubtask (CRLF)');
}

// 12. Update handleSubTaskStatusDirectUpdate to record status_changed history
const oldDirectStatus = `    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: task.id, sub_tasks: updatedSubs }),
      });`;

const newDirectStatus = `    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const targetSub = currentSubs.find((s) => s.id === subId);
      const currentHist = Array.isArray(task.history) ? [...task.history] : [];
      currentHist.push({
        id: \`hist_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
        action: "status_changed",
        timestamp: new Date().toISOString(),
        user_id: user?.id || null,
        user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "User",
        user_role: (user as any)?.role || "Staff",
        subtask_id: subId,
        subtask_title: targetSub?.title || "Deliverable",
        old_status: targetSub?.status || "pending",
        new_status: newStatus,
        details: \`Status of deliverable "\${targetSub?.title || "Deliverable"}" changed to \${newStatus}\`,
      });

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: task.id, sub_tasks: updatedSubs, history: currentHist }),
      });`;

if (code.includes(oldDirectStatus)) {
  code = code.replace(oldDirectStatus, newDirectStatus);
  console.log('Updated handleSubTaskStatusDirectUpdate');
} else if (code.includes(oldDirectStatus.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldDirectStatus.replace(/\n/g, '\r\n'), newDirectStatus.replace(/\n/g, '\r\n'));
  console.log('Updated handleSubTaskStatusDirectUpdate (CRLF)');
}

// 13. In Modal 2: Update "Project Team" label to "All Staff"
const oldTeamBadge = `{isSelectedTaskAssigned ? (
                      <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                        Project Team ({subtaskAssigneeOptions.length})
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        All Staff
                      </span>
                    )}`;

const newTeamBadge = `<span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                        All Staff ({subtaskAssigneeOptions.length})
                      </span>`;

if (code.includes(oldTeamBadge)) {
  code = code.replace(oldTeamBadge, newTeamBadge);
  console.log('Updated team badge to All Staff in Modal 2');
} else if (code.includes(oldTeamBadge.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldTeamBadge.replace(/\n/g, '\r\n'), newTeamBadge.replace(/\n/g, '\r\n'));
  console.log('Updated team badge to All Staff in Modal 2 (CRLF)');
}

// 14. In Modal 2: Update Frequency & Cadence UI (Once, Daily, Weekly, Monthly)
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
                    <div className="text-[9px] text-muted-foreground mt-0.5">Single deliverable</div>
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
                    <div className="text-[9px] text-muted-foreground mt-0.5">Repeats weekly</div>
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
                    <div className="text-[9px] text-muted-foreground mt-0.5">Repeats monthly</div>
                  </button>
                </div>
              </div>`;

if (code.includes(oldCadenceUi)) {
  code = code.replace(oldCadenceUi, newCadenceUi);
  console.log('Updated Cadence UI in Modal 2');
} else if (code.includes(oldCadenceUi.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldCadenceUi.replace(/\n/g, '\r\n'), newCadenceUi.replace(/\n/g, '\r\n'));
  console.log('Updated Cadence UI in Modal 2 (CRLF)');
}

// 15. On Subtask Card on Board: Add History button in top-right
const oldSubtaskTopRight = `                              <div className="flex items-center gap-1.5 shrink-0">
                                {getUrgencyBadge(sub.urgency)}
                                {canEditOrRemove && (`;

const newSubtaskTopRight = `                              <div className="flex items-center gap-1.5 shrink-0">
                                {getUrgencyBadge(sub.urgency)}
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
  console.log('Added History button to Subtask Card');
} else if (code.includes(oldSubtaskTopRight.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldSubtaskTopRight.replace(/\n/g, '\r\n'), newSubtaskTopRight.replace(/\n/g, '\r\n'));
  console.log('Added History button to Subtask Card (CRLF)');
}

// 16. On Subtask Card on Board: Add Upload task and Update work buttons at bottom
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
  console.log('Added Upload task and Update work buttons to Subtask Card');
} else if (code.includes(oldSubtaskBottom.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldSubtaskBottom.replace(/\n/g, '\r\n'), newSubtaskBottom.replace(/\n/g, '\r\n'));
  console.log('Added Upload task and Update work buttons to Subtask Card (CRLF)');
}

// 17. Mount TaskHistoryDialog (with filters), SubTaskUploadDialog, and SubTaskWorkUpdateDialog
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
  console.log('Mounted SubTaskUploadDialog and SubTaskWorkUpdateDialog');
} else if (code.includes(oldHistDialog.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldHistDialog.replace(/\n/g, '\r\n'), newHistDialog.replace(/\n/g, '\r\n'));
  console.log('Mounted SubTaskUploadDialog and SubTaskWorkUpdateDialog (CRLF)');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Successfully completed full wiring of app/admin/operations/tasks/page.tsx!');

