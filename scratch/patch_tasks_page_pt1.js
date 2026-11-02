const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Add assigned_clients to OperationTask
const targetTaskType = `  assigned_employees?: Array<{
    id: number;
    name: string;
    role?: string | null;
    email?: string | null;
  }>;`;

const replaceTaskType = `  assigned_employees?: Array<{
    id: number;
    name: string;
    role?: string | null;
    email?: string | null;
  }>;
  assigned_clients?: Array<{
    id: number;
    name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    client_type?: string | null;
  }>;`;

if (content.includes(targetTaskType)) {
  content = content.replace(targetTaskType, replaceTaskType);
  console.log('1. Added assigned_clients to OperationTask type');
} else {
  console.log('1. targetTaskType not found');
}

// 2. Add formAssignedClientIds state
const targetState = `  const [formClientId, setFormClientId] = useState<string>("none");
  const [formClientName, setFormClientName] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);`;

const replaceState = `  const [formClientId, setFormClientId] = useState<string>("none");
  const [formClientName, setFormClientName] = useState("");
  const [formAssignedClientIds, setFormAssignedClientIds] = useState<string[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const fetchClientsForModal = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;
      const res = await fetch("/api/admin/sales/clients?status=active", { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.clients) && json.clients.length > 0) {
          setClients(json.clients);
        }
      }
    } catch (err) {
      console.warn("fetchClientsForModal error:", err);
    }
  }, [accessToken]);`;

if (content.includes(targetState)) {
  content = content.replace(targetState, replaceState);
  console.log('2. Added formAssignedClientIds and fetchClientsForModal');
} else {
  console.log('2. targetState not found');
}

// 3. Update handleOpenNewTaskModal
const targetNewModal = `    setFormClientId("none");
    setFormClientName("");
    setClientSearchQuery("");
    setClientDropdownOpen(false);`;

const replaceNewModal = `    setFormClientId("none");
    setFormClientName("");
    setFormAssignedClientIds([]);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();`;

if (content.includes(targetNewModal)) {
  content = content.replace(targetNewModal, replaceNewModal);
  console.log('3. Updated handleOpenNewTaskModal');
} else {
  console.log('3. targetNewModal not found');
}

// 4. Update handleOpenEditTask
const targetEditModal = `    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    setClientSearchQuery("");
    setClientDropdownOpen(false);`;

const replaceEditModal = `    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    const initialClientIds = Array.isArray(t.assigned_clients) && t.assigned_clients.length > 0
      ? t.assigned_clients.map((c) => String(c.id))
      : (t.client_id ? [String(t.client_id)] : []);
    setFormAssignedClientIds(initialClientIds);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();`;

if (content.includes(targetEditModal)) {
  content = content.replace(targetEditModal, replaceEditModal);
  console.log('4. Updated handleOpenEditTask');
} else {
  console.log('4. targetEditModal not found');
}

// 5. Update handleSaveMainTask
const targetSaveTask = `      const selectedStaffObjects = dialogStaffList
        .filter((s) => formAssignedStaffIds.includes(String(s.id)))
        .map((s) => ({ id: s.id, name: s.name, role: s.role || null, email: s.email || null }));

      const primaryStaffId = selectedStaffObjects.length > 0
        ? selectedStaffObjects[0].id
        : (formAssignedStaffId !== "none" ? parseInt(formAssignedStaffId) : null);
      const combinedStaffNames = selectedStaffObjects.length > 0
        ? selectedStaffObjects.map((s) => s.name).filter(Boolean).join(", ")
        : (formAssignedStaffName.trim() || null);
      const combinedStaffRoles = selectedStaffObjects.length > 0
        ? selectedStaffObjects.map((s) => s.role).filter(Boolean).join(", ")
        : (formAssignedStaffRole.trim() || null);

      const res = await fetch("/api/admin/operations/tasks", {
        method,
        headers,
        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          institution_id: isPlatformRoute ? 1 : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : 1),
          client_id: isInstitutionAdmin ? null : (formClientId !== "none" ? formClientId : null),
          client_name: isInstitutionAdmin ? null : (formClientName.trim() || null),`;

const replaceSaveTask = `      const selectedStaffObjects = dialogStaffList
        .filter((s) => formAssignedStaffIds.includes(String(s.id)))
        .map((s) => ({ id: s.id, name: s.name, role: s.role || null, email: s.email || null }));

      const primaryStaffId = selectedStaffObjects.length > 0
        ? selectedStaffObjects[0].id
        : (formAssignedStaffId !== "none" ? parseInt(formAssignedStaffId) : null);
      const combinedStaffNames = selectedStaffObjects.length > 0
        ? selectedStaffObjects.map((s) => s.name).filter(Boolean).join(", ")
        : (formAssignedStaffName.trim() || null);
      const combinedStaffRoles = selectedStaffObjects.length > 0
        ? selectedStaffObjects.map((s) => s.role).filter(Boolean).join(", ")
        : (formAssignedStaffRole.trim() || null);

      const selectedClientObjects = clients
        .filter((c) => formAssignedClientIds.includes(String(c.id)))
        .map((c) => ({
          id: c.id,
          name: c.name,
          company_name: c.company_name || c.name,
          email: c.email || null,
          phone: c.phone || null,
          client_type: c.client_type || null,
        }));

      const primaryClientId = selectedClientObjects.length > 0
        ? selectedClientObjects[0].id
        : (formClientId !== "none" ? parseInt(formClientId) : null);
      const combinedClientNames = selectedClientObjects.length > 0
        ? selectedClientObjects.map((c) => c.company_name || c.name).filter(Boolean).join(", ")
        : (formClientName.trim() || null);

      const res = await fetch("/api/admin/operations/tasks", {
        method,
        headers,
        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          institution_id: isPlatformRoute ? 1 : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : 1),
          client_id: formProjectFor === "client" ? primaryClientId : null,
          client_name: formProjectFor === "client" ? combinedClientNames : "EduBird",
          assigned_clients: formProjectFor === "client" ? selectedClientObjects : [],`;

if (content.includes(targetSaveTask)) {
  content = content.replace(targetSaveTask, replaceSaveTask);
  console.log('5. Updated handleSaveMainTask');
} else {
  console.log('5. targetSaveTask not found');
}

// 6. Update Project Card Client Display
const targetCardClient = `                  {/* Project Details Bar: Client/Own Company, Leader, Dates, URLs */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {!isInstitutionAdmin && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground">For:</span>
                        <Badge variant={task.project_for === "own_company" ? "default" : "secondary"} className="text-[11px] py-0 px-2 font-semibold">
                          {task.project_for === "own_company" ? "EduBird (Own Company)" : (task.client_name || "Client")}
                        </Badge>
                      </div>
                    )}`;

const replaceCardClient = `                  {/* Project Details Bar: Client/Own Company, Leader, Dates, URLs */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1.5 font-medium flex-wrap">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">For:</span>
                      {task.project_for === "own_company" ? (
                        <Badge variant="default" className="text-[11px] py-0 px-2 font-semibold">
                          EduBird (Own Company)
                        </Badge>
                      ) : Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0 ? (
                        task.assigned_clients.map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-[11px] py-0 px-2 font-semibold gap-1">
                            <Building2 className="w-2.5 h-2.5 text-primary" />
                            {c.company_name || c.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-[11px] py-0 px-2 font-semibold">
                          {task.client_name || "Client"}
                        </Badge>
                      )}
                    </div>`;

if (content.includes(targetCardClient)) {
  content = content.replace(targetCardClient, replaceCardClient);
  console.log('6. Updated Project Card Client Display');
} else {
  console.log('6. targetCardClient not found');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Finished updating page.tsx step 1.');

