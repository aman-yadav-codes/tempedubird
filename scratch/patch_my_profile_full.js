const fs = require('fs');

let code = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('import { SubtaskCard }')) {
  code = code.replace(
    'import { TaskHistoryDialog } from "../operations/tasks/task-history-dialog";',
    `import { TaskHistoryDialog } from "../operations/tasks/task-history-dialog";
import { SubTaskUploadDialog } from "../operations/tasks/subtask-upload-dialog";
import { SubtaskCard } from "@/components/subtask-card";
import { EditSubtaskDialog } from "@/components/edit-subtask-dialog";`
  );
}

// 2. State & Helpers
const stateAnchor = '  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<number, boolean>>({});';
const newStateBlock = `  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<number, boolean>>({});
  const [uploadModalState, setUploadModalState] = useState<{ task: any; subtask: any } | null>(null);
  const [editSubtaskDialogOpen, setEditSubtaskDialogOpen] = useState(false);
  const [editingSubtaskTargetTask, setEditingSubtaskTargetTask] = useState<any>(null);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);

  const isClientRole = useMemo(() => {
    if (!user) return Boolean(pathname?.startsWith("/client"));
    const codes = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    return codes.includes("client") || (user as any)?.role === "client" || (user as any)?.primary_role === "client" || Boolean(pathname?.startsWith("/client"));
  }, [user, pathname]);

  const handleRefreshMyProfileTasks = async () => {
    try {
      const instQuery = activeInstitutionId ? \`&institution_id=\${activeInstitutionId}\` : "";
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;
      const tRes = await fetch(\`/api/admin/operations/tasks?scope=me&employee_id=me\${instQuery}\`, { headers });
      const tData = await tRes.json();
      if (tData?.tasks) setTasks(tData.tasks);
    } catch (err) {
      console.error("Failed to refresh tasks:", err);
    }
  };

  const getProjectStaffOptions = (task: any) => {
    const list: Array<{ id: number | string; name: string; role?: string | null }> = [];
    if (Array.isArray(task.assigned_employees)) {
      task.assigned_employees.forEach((e: any) => {
        if (e && e.id && !list.some((l) => String(l.id) === String(e.id))) {
          list.push({ id: e.id, name: e.name || "Employee", role: e.role || null });
        }
      });
    }
    if (task.assigned_employee_id && !list.some((l) => String(l.id) === String(task.assigned_employee_id))) {
      list.push({
        id: task.assigned_employee_id,
        name: task.assigned_employee_name || "Assigned Staff",
        role: task.assigned_employee_role || null,
      });
    }
    if (user?.id && !list.some((l) => String(l.id) === String(user.id))) {
      list.push({
        id: user.id,
        name: (user as any)?.full_name || (user as any)?.name || "Me",
        role: (user as any)?.role || null,
      });
    }
    return list;
  };

  const handleDirectSubtaskFieldUpdate = async (task: any, subId: string, updates: Record<string, any>) => {
    try {
      const currentSubs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const updatedSubs = currentSubs.map((s: any) => (String(s.id) === String(subId) ? { ...s, ...updates } : s));

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, sub_tasks: updatedSubs } : t))
      );

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: task.id,
          sub_tasks: updatedSubs,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update sub-task");
      }
      toast.success("Sub-task updated");
      void handleRefreshMyProfileTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update sub-task");
      void handleRefreshMyProfileTasks();
    }
  };

  const handleDirectSubtaskDelete = async (task: any, subId: string) => {
    if (!confirm("Are you sure you want to delete this sub-task?")) return;
    try {
      const currentSubs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const remainingSubs = currentSubs.filter((s: any) => String(s.id) !== String(subId));

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, sub_tasks: remainingSubs } : t))
      );

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: task.id,
          sub_tasks: remainingSubs,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete sub-task");
      }
      toast.success("Sub-task deleted");
      void handleRefreshMyProfileTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sub-task");
      void handleRefreshMyProfileTasks();
    }
  };

  const handleOpenAddSubtask = (task: any) => {
    setEditingSubtaskTargetTask(task);
    setEditingSubtask({
      id: \`sub_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
      title: "",
      price: 0,
      urgency: "medium",
      cadence: "once",
      is_daily_recurring: false,
      duration_hours: 1,
      duration_minutes: 0,
      points: 20,
      penalty_points: 10,
    });
    setEditSubtaskDialogOpen(true);
  };`;

if (code.includes(stateAnchor) && !code.includes('handleRefreshMyProfileTasks')) {
  code = code.replace(stateAnchor, newStateBlock);
  console.log("Added state and helpers to my-profile-client.tsx");
}

// 3. Remove the top card in Tab 4 (Tasks Assigned to You) as requested in user's image
const oldTopCard = `        {/* ================= TAB 4: MY TASKS ================= */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-xs">
            <div>
              <h3 className="font-bold text-base text-foreground">Tasks Assigned to You</h3>
              <p className="text-xs text-muted-foreground">Deliverables, academic responsibilities, and operational assignments</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary">
                {tasks.filter(t => normalizeTaskStatus(t.status) === "completed").length} of {tasks.length} Completed
              </span>
              <Button
                size="sm"
                onClick={() => setCreateTaskDialogOpen(true)}
                className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </Button>
            </div>
          </div>

          {/* STATUS TABS NAVIGATION BAR */}`;

const newTopCard = `        {/* ================= TAB 4: MY TASKS ================= */}
        <TabsContent value="tasks" className="space-y-6">
          {/* STATUS TABS NAVIGATION BAR */}`;

if (code.includes(oldTopCard)) {
  code = code.replace(oldTopCard, newTopCard);
  console.log("Removed top 'Tasks Assigned to You' card header from Tab 4!");
}

// 4. Update the subtask header to include "+ add sub task" button and replace subtask list with SubtaskCard
const oldSubtaskHeaderAndListMarker = `                    {/* Sub-Tasks List (if any) */}
                    {subTasksList.length > 0 && (
                      <div className="px-5 py-3 border-t bg-card">`;

const subtaskEndMarker = `                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>`;

const sStart = code.indexOf(oldSubtaskHeaderAndListMarker);
if (sStart !== -1) {
  const sEnd = code.indexOf(subtaskEndMarker, sStart);
  if (sEnd !== -1) {
    const newSubtaskSection = `                    {/* Sub-Tasks List & Header with + add sub task */}
                    <div className="px-5 py-3 border-t bg-card">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground pb-2 flex-wrap gap-2">
                        <div
                          className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none"
                          onClick={() => setExpandedTaskSubtasks(prev => ({ ...prev, [task.id]: !isExpanded }))}
                        >
                          <Layers className="w-4 h-4 text-primary" />
                          <span>
                            Sub-Tasks & Deliverables ({subTasksList.length}
                            {rawSubTasksList.length !== subTasksList.length ? \` of \${rawSubTasksList.length}\` : ""})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddSubtask(task);
                            }}
                            className="h-6 px-2.5 text-[11px] font-bold gap-1 rounded-lg border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
                            title="Add sub-task deliverable to this project"
                          >
                            <Plus className="w-3 h-3 text-primary" />
                            add sub task
                          </Button>
                          <span
                            className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground select-none"
                            onClick={() => setExpandedTaskSubtasks(prev => ({ ...prev, [task.id]: !isExpanded }))}
                          >
                            {isExpanded ? "Collapse" : "Expand"}
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                      </div>

                      {isExpanded && subTasksList.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {subTasksList.map((sub: any, sIdx: number) => (
                            <SubtaskCard
                              key={sub.id || sIdx}
                              task={task}
                              subtask={sub}
                              index={sIdx}
                              currentUserId={user?.id}
                              isClientView={isClientRole || Boolean(pathname?.startsWith("/client"))}
                              staffOptions={getProjectStaffOptions(task)}
                              onUpdateSubtask={handleDirectSubtaskFieldUpdate}
                              onDeleteSubtask={handleDirectSubtaskDelete}
                              onOpenEdit={(t, s) => {
                                setEditingSubtaskTargetTask(t);
                                setEditingSubtask(s);
                                setEditSubtaskDialogOpen(true);
                              }}
                              onOpenHistory={() => setHistoryModalTask(task)}
                              onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s })}
                              onStatusChange={(t, subId, status) => handleSubtaskStatusUpdate(t, subId, status)}
                              onStart={(t, s) => handleSubtaskStatusUpdate(t, s.id, "in_progress")}
                              onStop={(t, s) => handleSubtaskStatusUpdate(t, s.id, "pending")}
                            />
                          ))}
                        </div>
                      )}

                      {isExpanded && subTasksList.length === 0 && (
                        <div className="py-6 text-center border border-dashed rounded-xl my-2 text-xs text-muted-foreground">
                          No sub-tasks yet. Click &quot;add sub task&quot; to assign deliverables.
                        </div>
                      )}`;
    
    code = code.substring(0, sStart) + newSubtaskSection + code.substring(sEnd);
    console.log("Replaced Subtask section in my-profile-client.tsx with SubtaskCard!");
  } else {
    console.log("Could not find subtaskEndMarker");
  }
} else {
  console.log("Could not find oldSubtaskHeaderAndListMarker");
}

// 5. Mount SubTaskUploadDialog and EditSubtaskDialog alongside TaskHistoryDialog
const historyAnchor = `          {/* Task History Audit Trail Dialog */}
          <TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => !open && setHistoryModalTask(null)}
            task={historyModalTask}
          />`;

const newDialogsBlock = `          {/* Task History Audit Trail Dialog */}
          <TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => !open && setHistoryModalTask(null)}
            task={historyModalTask}
          />

          {/* Sub-Task Upload Dialog (Images, Videos, PDF, Word, Excel) */}
          <SubTaskUploadDialog
            open={Boolean(uploadModalState)}
            onOpenChange={(open) => !open && setUploadModalState(null)}
            task={uploadModalState?.task || null}
            subtask={uploadModalState?.subtask || null}
            onSaved={handleRefreshMyProfileTasks}
          />

          {/* Edit / Add Sub-Task Dialog with single cadence dropdown */}
          <EditSubtaskDialog
            open={editSubtaskDialogOpen}
            onOpenChange={setEditSubtaskDialogOpen}
            task={editingSubtaskTargetTask}
            subtask={editingSubtask}
            staffOptions={editingSubtaskTargetTask ? getProjectStaffOptions(editingSubtaskTargetTask) : []}
            onSaved={handleRefreshMyProfileTasks}
            accessToken={accessToken}
          />`;

if (code.includes(historyAnchor) && !code.includes('EditSubtaskDialog')) {
  code = code.replace(historyAnchor, newDialogsBlock);
  console.log("Mounted SubTaskUploadDialog and EditSubtaskDialog in my-profile-client.tsx!");
}

fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', code, 'utf8');
console.log("Done updating my-profile-client.tsx!");

