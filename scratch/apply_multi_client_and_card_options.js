const fs = require("fs");
const path = require("path");

// 1. Patch app/admin/operations/tasks/page.tsx
const tasksPagePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
let tasksCode = fs.readFileSync(tasksPagePath, "utf-8");

// Add historyModalSubtask state if not present
if (!tasksCode.includes("historyModalSubtask")) {
  tasksCode = tasksCode.replace(
    /const \[historyModalTask, setHistoryModalTask\] = useState<OperationTask \| null>\(null\);/,
    `const [historyModalTask, setHistoryModalTask] = useState<OperationTask | null>(null);\n  const [historyModalSubtask, setHistoryModalSubtask] = useState<any | null>(null);`
  );
}

// In handleOpenEditTask, ensure robust parsing of assigned_clients & populating clients state
const oldHandleOpenEdit = `    const initialClientIds = Array.isArray(t.assigned_clients) && t.assigned_clients.length > 0
      ? t.assigned_clients.map((c) => String(c.id))
      : (t.client_id ? [String(t.client_id)] : []);
    setFormAssignedClientIds(initialClientIds);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();`;

const newHandleOpenEdit = `    let parsedAssignedClients: any[] = [];
    if (Array.isArray(t.assigned_clients)) {
      parsedAssignedClients = t.assigned_clients;
    } else if (typeof (t as any).assigned_clients === "string") {
      try {
        const p = JSON.parse((t as any).assigned_clients);
        if (Array.isArray(p)) parsedAssignedClients = p;
      } catch {}
    }
    let initialClientIds = parsedAssignedClients.map((c: any) => String(c.id || c.client_id)).filter(Boolean);
    if (initialClientIds.length === 0 && t.client_id) {
      initialClientIds = [String(t.client_id)];
    }
    if (initialClientIds.length === 0 && t.client_name && t.client_name !== "EduBird") {
      const matched = clients.find((c) =>
        (c.company_name && c.company_name.toLowerCase().trim() === t.client_name?.toLowerCase().trim()) ||
        (c.name && c.name.toLowerCase().trim() === t.client_name?.toLowerCase().trim())
      );
      if (matched) {
        initialClientIds = [String(matched.id)];
        if (!parsedAssignedClients.length) parsedAssignedClients = [matched];
      }
    }
    if (parsedAssignedClients.length > 0) {
      setClients((prev) => {
        const existingIds = new Set(prev.map((c) => String(c.id)));
        const newOnes = parsedAssignedClients.filter((c: any) => c?.id && !existingIds.has(String(c.id)));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
    setFormAssignedClientIds(initialClientIds);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal(initialInstId);`;

if (tasksCode.includes(oldHandleOpenEdit)) {
  tasksCode = tasksCode.replace(oldHandleOpenEdit, newHandleOpenEdit);
}

// In handleSaveMainTask, ensure selectedClientObjects is formed robustly
const oldClientObjMapping = `            const selectedClientObjects = clients
        .filter((c) => formAssignedClientIds.includes(String(c.id)))
        .map((c) => ({
          id: c.id,
          name: c.name,
          company_name: c.company_name || c.name,
          email: c.email || null,
          phone: c.phone || null,
          client_type: c.client_type || null,
        }));`;

const newClientObjMapping = `      const clientPool = [...clients, ...(Array.isArray(editingTask?.assigned_clients) ? editingTask.assigned_clients : [])];
      const selectedClientObjects = formAssignedClientIds.map((id) => {
        const found = clientPool.find((c) => String(c.id) === String(id));
        if (found) {
          return {
            id: Number(found.id),
            name: found.name,
            company_name: found.company_name || found.name,
            email: found.email || null,
            phone: found.phone || null,
            client_type: found.client_type || null,
          };
        }
        return {
          id: Number(id),
          name: formClientName || "Client",
          company_name: formClientName || "Client",
          email: null,
          phone: null,
          client_type: null,
        };
      });`;

if (tasksCode.includes(oldClientObjMapping)) {
  tasksCode = tasksCode.replace(oldClientObjMapping, newClientObjMapping);
}

// Remove "+ Create Task / Project" in client workspace header (Image 9)
const oldClientHeaderBtn = `          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary">
              {tasks.filter((t) => t.status === "completed").length} of {tasks.length} Completed
            </span>
            <Button onClick={handleOpenCreateTask} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5 h-9">
              <Plus className="w-4 h-4" /> Create Task / Project
            </Button>
          </div>`;

const newClientHeaderBtn = `          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary">
              {tasks.filter((t) => t.status === "completed").length} of {tasks.length} Completed
            </span>
          </div>`;

if (tasksCode.includes(oldClientHeaderBtn)) {
  tasksCode = tasksCode.replace(oldClientHeaderBtn, newClientHeaderBtn);
}

// In client project card, remove Edit & Delete from Dropdown (Image 10)
const oldClientMenu = `                          <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                            <DropdownMenuItem
                              onClick={() => setInvoicesModalTask(task)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Receipt className="w-4 h-4 text-primary" />
                              <span>Invoices</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEditTask(task)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setHistoryModalTask(task)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <History className="w-4 h-4 text-amber-600" />
                              <span>History and info</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id)}
                              className="gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>`;

const newClientMenu = `                          <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                            <DropdownMenuItem
                              onClick={() => setInvoicesModalTask(task)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Receipt className="w-4 h-4 text-primary" />
                              <span>Invoices</span>
                            </DropdownMenuItem>
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
                          </DropdownMenuContent>`;

if (tasksCode.includes(oldClientMenu)) {
  tasksCode = tasksCode.replace(oldClientMenu, newClientMenu);
}

// In SubtaskCard calls, pass onOpenHistory with subtask:
tasksCode = tasksCode.replace(
  /onOpenHistory=\{\(\) => setHistoryModalTask\(task\)\}/g,
  `onOpenHistory={(t, s) => { setHistoryModalSubtask(s); setHistoryModalTask(t); }}`
);

// In TaskHistoryDialog call, pass filterSubtaskId and filterSubtaskTitle
const oldHistoryCall = `<TaskHistoryDialog
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => !open && setHistoryModalTask(null)}
        task={historyModalTask}
      />`;

const newHistoryCall = `<TaskHistoryDialog
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

if (tasksCode.includes(oldHistoryCall)) {
  tasksCode = tasksCode.replace(oldHistoryCall, newHistoryCall);
}

// Status Tab badge pill color (Image 7): active tab gets bold red pill
const oldTabBadge = `                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"`;
const newTabBadge = `                  isSelected ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"`;
if (tasksCode.includes(oldTabBadge)) {
  tasksCode = tasksCode.replace(oldTabBadge, newTabBadge);
}

fs.writeFileSync(tasksPagePath, tasksCode, "utf-8");
console.log("Successfully patched app/admin/operations/tasks/page.tsx");

