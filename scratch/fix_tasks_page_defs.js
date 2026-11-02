const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Add newSubCadence state
if (!code.includes('const [newSubCadence, setNewSubCadence]')) {
  code = code.replace(
    'const [newSubIsDailyRecurring, setNewSubIsDailyRecurring] = useState<boolean>(false);',
    `const [newSubIsDailyRecurring, setNewSubIsDailyRecurring] = useState<boolean>(false);
  const [newSubCadence, setNewSubCadence] = useState<string>("once");`
  );
}

// 2. Add getProjectStaffOptions, handleDirectSubtaskFieldUpdate, handleDirectSubtaskDelete
const target = `  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);`;
const replacement = `  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);

  const getProjectStaffOptions = useCallback((task: OperationTask) => {
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
    if (Array.isArray(staffList)) {
      staffList.forEach((s: any) => {
        if (s && s.id && !list.some((l) => String(l.id) === String(s.id))) {
          list.push({ id: s.id, name: s.name || s.full_name || "Staff", role: s.role || null });
        }
      });
    }
    return list;
  }, [staffList]);

  const handleDirectSubtaskFieldUpdate = async (task: OperationTask, subId: string, updates: Record<string, any>) => {
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
      void fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update sub-task");
      void fetchTasks();
    }
  };

  const handleDirectSubtaskDelete = async (task: OperationTask, subId: string) => {
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
      void fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sub-task");
      void fetchTasks();
    }
  };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  console.log("Successfully inserted helper functions into tasks page!");
} else {
  console.log("Target not found!");
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');

