const fs = require("fs");
const path = require("path");

const profileClientPath = path.join(__dirname, "../app/admin/my-profile/my-profile-client.tsx");
let code = fs.readFileSync(profileClientPath, "utf-8");

// 1. Add historyModalSubtask state
if (!code.includes("historyModalSubtask")) {
  code = code.replace(
    /const \[historyModalTask, setHistoryModalTask\] = useState<any>\(null\);/,
    `const [historyModalTask, setHistoryModalTask] = useState<any>(null);\n  const [historyModalSubtask, setHistoryModalSubtask] = useState<any>(null);`
  );
}

// 2. Add handleDeleteTask if not present
if (!code.includes("const handleDeleteTask =")) {
  const deleteFunc = `  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task/project?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch(\`/api/admin/operations/tasks?id=\${id}\`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Task deleted successfully");
        fetchTasks();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to delete task");
      }
    } catch {
      toast.error("Failed to delete task");
    }
  };\n`;

  code = code.replace(
    /  const handleUpdateTaskStatus =/,
    `${deleteFunc}\n  const handleUpdateTaskStatus =`
  );
}

// 3. Update the header actions of the task card in my-profile-client.tsx
// Add project status dropdown, + Sub-Tasks button, and 3-dots actions (invoices, Edit, History and info, delete)
const oldCardActions = `                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHistoryModalTask(task)}
                            className="h-7 px-2.5 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer shadow-2xs"
                            title="View Task History & Location"
                          >
                            <History className="w-3.5 h-3.5 text-primary" />
                            <span>History</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                                title="More project actions"
                              >
                                <MoreVertical className="w-4 h-4 fill-current text-red-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                              <DropdownMenuItem
                                onClick={() => setInvoicesModalTask(task)}
                                className="gap-2 cursor-pointer font-medium"
                              >
                                <Receipt className="w-4 h-4 text-primary" />
                                <span>Invoices</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setHistoryModalTask(task)}
                                className="gap-2 cursor-pointer font-medium"
                              >
                                <History className="w-4 h-4 text-amber-600" />
                                <span>History and info</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>`;

const newCardActions = `                          {/* Project Status Dropdown (Image 8) */}
                          <select
                            value={task.status || "pending"}
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                            className="h-7 text-xs font-bold w-28 bg-muted/40 rounded-lg border border-input px-2 outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer text-foreground capitalize"
                            title="Change project status"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On hold</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="failed">Failed</option>
                          </select>

                          {/* + Sub-Tasks button (Image 8) */}
                          <Button
                            size="sm"
                            onClick={() => handleOpenAddSubTaskModal(task)}
                            className="h-7 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shadow-2xs cursor-pointer"
                            title="Add deliverables and sub-tasks"
                          >
                            <Plus className="w-3.5 h-3.5" /> + Sub-Tasks
                          </Button>

                          {/* 3-dots Menu: invoices, Edit, History and info, delete */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                                title="More project actions"
                              >
                                <MoreVertical className="w-4 h-4 fill-current text-red-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                              <DropdownMenuItem
                                onClick={() => setInvoicesModalTask(task)}
                                className="gap-2 cursor-pointer font-medium"
                              >
                                <Receipt className="w-4 h-4 text-primary" />
                                <span>Invoices</span>
                              </DropdownMenuItem>
                              {!isClientRole && (
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditSubtask(task, task.sub_tasks?.[0] || { id: \`task_\${task.id}\`, title: task.title })}
                                  className="gap-2 cursor-pointer font-medium"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setHistoryModalSubtask(null);
                                  setHistoryModalTask(task);
                                }}
                                className="gap-2 cursor-pointer font-medium"
                              >
                                <History className="w-4 h-4 text-amber-600" />
                                <span>History and info</span>
                              </DropdownMenuItem>
                              {!isClientRole && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>`;

if (code.includes(oldCardActions)) {
  code = code.replace(oldCardActions, newCardActions);
}

// 4. Update SubtaskCard onOpenHistory binding
code = code.replace(
  /onOpenHistory=\{\(\) => setHistoryModalTask\(task\)\}/g,
  `onOpenHistory={(t, s) => { setHistoryModalSubtask(s); setHistoryModalTask(t); }}`
);

// 5. Update TaskHistoryDialog binding in my-profile-client.tsx
const oldProfileHistory = `<TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => !open && setHistoryModalTask(null)}
            task={historyModalTask}
          />`;

const newProfileHistory = `<TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => {
              if (!open) {
                setHistoryModalTask(null);
                setHistoryModalSubtask(null);
              }
            }}
            task={historyModalTask}
            filterSubtaskId={historyModalSubtask?.id}
            filterSubtaskTitle={historyModalSubtask?.title}
          />`;

if (code.includes(oldProfileHistory)) {
  code = code.replace(oldProfileHistory, newProfileHistory);
}

fs.writeFileSync(profileClientPath, code, "utf-8");
console.log("Successfully patched app/admin/my-profile/my-profile-client.tsx");

