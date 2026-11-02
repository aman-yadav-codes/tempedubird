const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Add DropdownMenu imports if not present
if (!code.includes('DropdownMenuTrigger')) {
  code = code.replace(
    'import { TaskHistoryDialog } from "./task-history-dialog";',
    `import { TaskHistoryDialog } from "./task-history-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";`
  );
}

// 2. Add MoreVertical to lucide-react imports if not present
if (!code.includes('MoreVertical,')) {
  code = code.replace(
    '  Edit2,',
    `  Edit2,
  MoreVertical,`
  );
}

// 3. Fix filteredClientList: show all clients retrieved for this workspace
const oldFilteredClients = `  const filteredClientList = useMemo(() => {
    let baseList = clients;
    if (isPlatformRoute) {
      const platformClients = clients.filter((c) => !c.institution_id || Number(c.institution_id) === 1);
      baseList = platformClients.length > 0 ? platformClients : clients;
    } else if (effectiveInstId) {
      const instNum = Number(effectiveInstId);
      const instClients = clients.filter((c) => !c.institution_id || Number(c.institution_id) === instNum || Number(c.institution_id) === 1);
      baseList = instClients.length > 0 ? instClients : clients;
    }
    if (!clientSearchQuery.trim()) return baseList;
    const q = clientSearchQuery.toLowerCase();
    return baseList.filter((c) => {
      const name = (c.company_name || c.name || "").toLowerCase();
      const type = (c.client_type || "").toLowerCase();
      const contact = (c.contact_person || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || type.includes(q) || contact.includes(q) || email.includes(q);
    });
  }, [clients, clientSearchQuery, isPlatformRoute]);`;

const newFilteredClients = `  const filteredClientList = useMemo(() => {
    let baseList = clients;
    if (!clientSearchQuery.trim()) return baseList;
    const q = clientSearchQuery.toLowerCase();
    return baseList.filter((c) => {
      const name = (c.company_name || c.name || "").toLowerCase();
      const type = (c.client_type || "").toLowerCase();
      const contact = (c.contact_person || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || type.includes(q) || contact.includes(q) || email.includes(q);
    });
  }, [clients, clientSearchQuery]);`;

if (code.includes(oldFilteredClients)) {
  code = code.replace(oldFilteredClients, newFilteredClients);
}

// 4. Enhance fetchClientsForModal to fallback to tasks endpoint so clients are always loaded
const oldFetchClients = `  const fetchClientsForModal = useCallback(async (instId?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;
      const params = new URLSearchParams();
      params.set("status", "all");
      const targetInst = instId || (formInstitutionId !== "none" && formInstitutionId !== "all" ? formInstitutionId : (effectiveInstId ? String(effectiveInstId) : ""));
      if (targetInst) params.set("institution_id", targetInst);
      const res = await fetch(\`/api/admin/sales/clients?\${params.toString()}\`, { headers });
      if (res.ok) {
        const json = await res.json();
        const clientItems = Array.isArray(json.clients) ? json.clients : (Array.isArray(json.records) ? json.records : []);
        if (clientItems.length > 0) {
          setClients(clientItems);
        }
      }
    } catch (err) {
      console.warn("fetchClientsForModal error:", err);
    }
  }, [accessToken, formInstitutionId, effectiveInstId]);`;

const newFetchClients = `  const fetchClientsForModal = useCallback(async (instId?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;
      const params = new URLSearchParams();
      params.set("status", "all");
      const targetInst = instId || (formInstitutionId !== "none" && formInstitutionId !== "all" ? formInstitutionId : (effectiveInstId ? String(effectiveInstId) : ""));
      if (targetInst && targetInst !== "none") params.set("institution_id", targetInst);
      let clientItems: any[] = [];
      const res = await fetch(\`/api/admin/sales/clients?\${params.toString()}\`, { headers });
      if (res.ok) {
        const json = await res.json();
        clientItems = Array.isArray(json.clients) ? json.clients : (Array.isArray(json.records) ? json.records : []);
      }
      if (clientItems.length === 0) {
        const fallbackRes = await fetch(\`/api/admin/operations/tasks?status=all\`, { headers });
        if (fallbackRes.ok) {
          const fbJson = await fallbackRes.json();
          if (Array.isArray(fbJson.clients) && fbJson.clients.length > 0) {
            clientItems = fbJson.clients;
          }
        }
      }
      if (clientItems.length > 0) {
        setClients(clientItems);
      }
    } catch (err) {
      console.warn("fetchClientsForModal error:", err);
    }
  }, [accessToken, formInstitutionId, effectiveInstId]);`;

if (code.includes(oldFetchClients)) {
  code = code.replace(oldFetchClients, newFetchClients);
}

// 5. Hide scope switcher bar on client portal and for client role
const oldScopeBarCondition = `      {/* Scope Switcher: Hidden on Institution Admin and Client side */}
      {!isInstitutionAdmin && !isClientRole && (`;

const newScopeBarCondition = `      {/* Scope Switcher: Hidden on Institution Admin and Client side */}
      {!isInstitutionAdmin && !isClientRole && !pathname?.startsWith("/client") && (`;

if (code.includes(oldScopeBarCondition)) {
  code = code.replace(oldScopeBarCondition, newScopeBarCondition);
}

// 6. Add subtask direct edit state, helper functions, and getProjectStaffOptions
const stateAnchor = `  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: any; subtask: any } | null>(null);`;
const newStateCode = `  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: any; subtask: any } | null>(null);
  const [editingSubtaskModal, setEditingSubtaskModal] = useState<{ task: OperationTask; subtask: any } | null>(null);

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

if (code.includes(stateAnchor)) {
  code = code.replace(stateAnchor, newStateCode);
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Page updated with state and helpers!');

