const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. OperationTask type
if (!code.includes('assigned_clients?: Array<')) {
  code = code.replace(
    `  assigned_employees?: Array<{
    id: number;
    name: string;
    role?: string | null;
    email?: string | null;
  }>;`,
    `  assigned_employees?: Array<{
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
  }>;`
  );
  console.log('1. Updated OperationTask type');
}

// 2. Add formAssignedClientIds state and fetchClientsForModal
if (!code.includes('formAssignedClientIds')) {
  code = code.replace(
    `  const [formClientId, setFormClientId] = useState<string>("none");
  const [formClientName, setFormClientName] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);`,
    `  const [formClientId, setFormClientId] = useState<string>("none");
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
  }, [accessToken]);`
  );
  console.log('2. Added formAssignedClientIds state');
}

// 3. Update handleOpenNewTaskModal
if (!code.includes('setFormAssignedClientIds([]);')) {
  code = code.replace(
    `    setFormClientId("none");
    setFormClientName("");
    setClientSearchQuery("");
    setClientDropdownOpen(false);`,
    `    setFormClientId("none");
    setFormClientName("");
    setFormAssignedClientIds([]);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();`
  );
  console.log('3. Updated handleOpenNewTaskModal');
}

// 4. Update handleOpenEditTask
if (!code.includes('const initialClientIds = Array.isArray(t.assigned_clients)')) {
  code = code.replace(
    `    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    setClientSearchQuery("");
    setClientDropdownOpen(false);`,
    `    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    const initialClientIds = Array.isArray(t.assigned_clients) && t.assigned_clients.length > 0
      ? t.assigned_clients.map((c) => String(c.id))
      : (t.client_id ? [String(t.client_id)] : []);
    setFormAssignedClientIds(initialClientIds);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();`
  );
  console.log('4. Updated handleOpenEditTask');
}

// 5. Update handleSaveMainTask
const oldSaveLogic = `      const selectedStaffObjects = dialogStaffList
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

const newSaveLogic = `      const selectedStaffObjects = dialogStaffList
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

if (code.includes(oldSaveLogic)) {
  code = code.replace(oldSaveLogic, newSaveLogic);
  console.log('5. Updated handleSaveMainTask');
} else {
  console.log('5. oldSaveLogic not found');
}

// 6. Update Project Card Client Display
const oldCardClient = `                  {/* Project Details Bar: Client/Own Company, Leader, Dates, URLs */}
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

const newCardClient = `                  {/* Project Details Bar: Client/Own Company, Leader, Dates, URLs */}
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

if (code.includes(oldCardClient)) {
  code = code.replace(oldCardClient, newCardClient);
  console.log('6. Updated Project Card Client Display');
} else {
  console.log('6. oldCardClient not found');
}

// 7. Replace Modal 1 with complete Project Dialog including multi-client assignment
const startMarker = '{/* MODAL 1: Create / Edit Task / Project */}';
const endMarker = '{/* MODAL 2: Dedicated Sub-Tasks Manager Modal */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found for Modal 1!", { startIndex, endIndex });
  process.exit(1);
}

// Read the complete modal replacement from scratch/replace_modal_jsx.js, but enhance the client picker
const newModalCode = `{/* MODAL 1: Create / Edit Project */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-[94vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              <span>{editingTask ? "Edit Project" : "Create Project"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide project details, ownership, timeline, budget currency, project leader, and agreement document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMainTask} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Organization / Institution Selection (if multiple) */}
              {!isInstitutionAdmin && (
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Organization / Institution *
                    </Label>
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {isPlatformRoute ? "EduBird Platform" : "Staff Dedicated to Organization"}
                    </span>
                  </div>
                  {isPlatformRoute ? (
                    <div className="flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background/80 shadow-xs">
                      <span className="font-semibold text-foreground truncate flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        EduBird Organization
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                        EduBird Staff Only
                      </Badge>
                    </div>
                  ) : institutions.length > 1 ? (
                    <select
                      value={formInstitutionId}
                      onChange={(e) => handleFormInstitutionChange(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={String(inst.id)}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background/80">
                      <span className="font-semibold text-foreground truncate">
                        {activeInstitution?.name || institutions[0]?.name || "My Organization"}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                        Active Organization
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. EduBird LMS Portal Redesign, Enterprise Cloud Migration"
                  className="text-xs h-9"
                />
              </div>

              {/* Ownership: For Own Company or Client */}
              <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Project For *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Select internal company or sales client</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormProjectFor("own_company");
                      setFormCompanyName("EduBird");
                      setFormClientName("EduBird");
                      setFormClientId("none");
                      setFormAssignedClientIds([]);
                    }}
                    className={\`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                      formProjectFor === "own_company"
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-background hover:bg-muted/40 border-border text-muted-foreground"
                    }\`}
                  >
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Own Company (EduBird)</div>
                      <div className="text-[10px] text-muted-foreground">Assign for EduBird platform</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormProjectFor("client");
                      setFormCompanyName("");
                      if (formClientName === "EduBird") {
                        setFormClientName("");
                        setFormClientId("none");
                      }
                      if (clients.length === 0) {
                        void fetchClientsForModal();
                      }
                    }}
                    className={\`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                      formProjectFor === "client"
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-background hover:bg-muted/40 border-border text-muted-foreground"
                    }\`}
                  >
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Client</div>
                      <div className="text-[10px] text-muted-foreground">Select from sales client section</div>
                    </div>
                  </button>
                </div>

                {formProjectFor === "own_company" ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>This project will be assigned for internal company: <strong>EduBird</strong></span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Client Name (From Sales Client Section) <span className="text-destructive">*</span>
                        {formAssignedClientIds.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                            {formAssignedClientIds.length} Selected
                          </Badge>
                        )}
                      </Label>
                      <div className="flex items-center gap-2">
                        <a
                          href={addClientUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-0.5 rounded-full"
                          title="Open clients directory to add a new client record"
                        >
                          <Plus className="w-3 h-3" /> Add Client
                        </a>
                        {formAssignedClientIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormAssignedClientIds([]);
                              setFormClientId("none");
                              setFormClientName("");
                              setClientSearchQuery("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multi-Client Searchable Picker Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!clientDropdownOpen && clients.length === 0) {
                            void fetchClientsForModal();
                          }
                          setClientDropdownOpen(!clientDropdownOpen);
                        }}
                        className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className={\`truncate text-left \${formAssignedClientIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}\`}>
                            {formAssignedClientIds.length === 0
                              ? "-- Select Client Account (Searchable) --"
                              : formAssignedClientIds.length === 1
                              ? (() => {
                                  const c = clients.find((cl) => String(cl.id) === formAssignedClientIds[0]);
                                  return c ? \`\${c.company_name || c.name} (\${c.client_type || "Client"})\` : (formClientName || "1 client selected");
                                })()
                              : \`\${formAssignedClientIds.length} clients selected\`}
                          </span>
                        </span>
                        <ChevronDown className={\`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 \${clientDropdownOpen ? "rotate-180" : ""}\`} />
                      </button>

                      {clientDropdownOpen && (
                        <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                              value={clientSearchQuery}
                              onChange={(e) => setClientSearchQuery(e.target.value)}
                              placeholder="Search clients by name, company, or type..."
                              className="pl-8 text-xs h-8"
                              autoFocus
                            />
                          </div>

                          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                            <span>
                              Showing {filteredClientList.length} client{filteredClientList.length === 1 ? "" : "s"}
                            </span>
                            <div className="flex items-center gap-2">
                              {filteredClientList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allIds = Array.from(new Set([...formAssignedClientIds, ...filteredClientList.map((c) => String(c.id))]));
                                    setFormAssignedClientIds(allIds);
                                    if (allIds.length > 0) {
                                      setFormClientId(String(allIds[0]));
                                      const primaryC = clients.find((c) => String(c.id) === String(allIds[0]));
                                      if (primaryC) setFormClientName(primaryC.company_name || primaryC.name);
                                    }
                                  }}
                                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                                >
                                  Select All
                                </button>
                              )}
                              {formAssignedClientIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormAssignedClientIds([]);
                                    setFormClientId("none");
                                    setFormClientName("");
                                  }}
                                  className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                            {filteredClientList.length === 0 ? (
                              <div className="py-4 text-center text-xs text-muted-foreground">
                                No clients found matching &quot;{clientSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredClientList.map((c) => {
                                const isChecked = formAssignedClientIds.includes(String(c.id));
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      if (isChecked) {
                                        const newIds = formAssignedClientIds.filter((id) => id !== String(c.id));
                                        setFormAssignedClientIds(newIds);
                                        if (newIds.length === 0) {
                                          setFormClientId("none");
                                          setFormClientName("");
                                        } else {
                                          setFormClientId(String(newIds[0]));
                                          const primaryC = clients.find((cl) => String(cl.id) === String(newIds[0]));
                                          if (primaryC) setFormClientName(primaryC.company_name || primaryC.name);
                                        }
                                      } else {
                                        const newIds = [...formAssignedClientIds, String(c.id)];
                                        setFormAssignedClientIds(newIds);
                                        setFormClientId(String(newIds[0]));
                                        setFormClientName(c.company_name || c.name);
                                      }
                                    }}
                                    className={\`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs \${
                                      isChecked
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "hover:bg-muted"
                                    }\`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => {}}
                                        className="h-3.5 w-3.5"
                                      />
                                      <Building2 className={\`w-3.5 h-3.5 shrink-0 \${isChecked ? "text-primary" : "text-muted-foreground"}\`} />
                                      <div className="min-w-0">
                                        <span className="font-semibold text-foreground truncate block">
                                          {c.company_name || c.name}
                                        </span>
                                        {c.company_name && c.name && c.company_name !== c.name && (
                                          <span className="text-[10px] text-muted-foreground truncate block font-normal">
                                            {c.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50 capitalize ml-2">
                                      {c.client_type || "Client"}
                                    </Badge>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Clients Badges / Chips */}
                    {formAssignedClientIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {clients
                          .filter((c) => formAssignedClientIds.includes(String(c.id)))
                          .map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[11px] py-1 pl-2 pr-1.5 gap-1.5 font-medium bg-muted/60 hover:bg-muted"
                            >
                              <Building2 className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[150px]">{c.company_name || c.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newIds = formAssignedClientIds.filter((id) => id !== String(c.id));
                                  setFormAssignedClientIds(newIds);
                                  if (newIds.length === 0) {
                                    setFormClientId("none");
                                    setFormClientName("");
                                  } else {
                                    setFormClientId(String(newIds[0]));
                                    const primaryC = clients.find((cl) => String(cl.id) === String(newIds[0]));
                                    if (primaryC) setFormClientName(primaryC.company_name || primaryC.name);
                                  }
                                }}
                                className="hover:bg-muted-foreground/20 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline: Start Date and Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Due Date / Deadline
                  </Label>
                  <Input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Budget & Cost Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Currency
                  </Label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Project Cost ({formCurrency === "INR" ? "₹" : formCurrency})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.00"
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Live and Demo URLs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    Live Website / Portal URL
                  </Label>
                  <Input
                    type="url"
                    value={formLiveUrl}
                    onChange={(e) => setFormLiveUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    Demo / Staging URL
                  </Label>
                  <Input
                    type="url"
                    value={formDemoUrl}
                    onChange={(e) => setFormDemoUrl(e.target.value)}
                    placeholder="https://staging..."
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Agreement Document Upload */}
              <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Project Agreement / Contract Document
                  </Label>
                  {formAgreementDocUrl && (
                    <a
                      href={formAgreementDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Uploaded Agreement
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleAgreementFileUpload}
                    disabled={uploadingAgreement}
                    className="text-xs h-9 bg-background file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {uploadingAgreement && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                </div>
                {formAgreementDocName && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-background px-2.5 py-1 rounded border">
                    <span className="truncate max-w-[400px]">📄 {formAgreementDocName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormAgreementDocUrl("");
                        setFormAgreementDocName("");
                      }}
                      className="text-destructive hover:underline text-[10px] ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Project Leader Assignment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Project Leader (Responsible Owner)
                </Label>
                <select
                  value={formProjectLeaderId}
                  onChange={(e) => {
                    setFormProjectLeaderId(e.target.value);
                    const s = dialogStaffList.find((st) => String(st.id) === e.target.value);
                    setFormProjectLeaderName(s?.name || "");
                  }}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                >
                  <option value="none">-- Select Project Leader (Optional) --</option>
                  {dialogStaffList.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} ({s.role || "Staff Member"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Members Multi-Select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Assign Team Staff Members (Multiple)
                    {formAssignedStaffIds.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                        {formAssignedStaffIds.length} Selected
                      </Badge>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    {formAssignedStaffIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormAssignedStaffIds([]);
                          setFormAssignedStaffId("none");
                          setFormAssignedStaffName("");
                          setFormAssignedStaffRole("");
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-xl border bg-background text-xs hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className={\`truncate text-left \${formAssignedStaffIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}\`}>
                        {formAssignedStaffIds.length === 0
                          ? "-- Select Staff Members (Searchable) --"
                          : formAssignedStaffIds.length === 1
                          ? (() => {
                              const s = dialogStaffList.find((st) => String(st.id) === formAssignedStaffIds[0]);
                              return s ? \`\${s.name} (\${s.role || "Staff Member"})\` : "1 staff member selected";
                            })()
                          : \`\${formAssignedStaffIds.length} staff members selected\`}
                      </span>
                    </span>
                    <ChevronDown className={\`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 \${staffDropdownOpen ? "rotate-180" : ""}\`} />
                  </button>

                  {staffDropdownOpen && (
                    <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          placeholder="Search staff by name or role..."
                          className="pl-8 text-xs h-8"
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                        <span>
                          Showing {filteredStaffList.length} staff member{filteredStaffList.length === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-2">
                          {filteredStaffList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = Array.from(new Set([...formAssignedStaffIds, ...filteredStaffList.map((s) => String(s.id))]));
                                setFormAssignedStaffIds(allIds);
                              }}
                              className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                            >
                              Select All
                            </button>
                          )}
                          {formAssignedStaffIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFormAssignedStaffIds([])}
                              className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {filteredStaffList.length === 0 ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            No staff found matching &quot;{staffSearchQuery}&quot;
                          </div>
                        ) : (
                          filteredStaffList.map((s) => {
                            const isChecked = formAssignedStaffIds.includes(String(s.id));
                            return (
                              <div
                                key={s.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => id !== String(s.id)));
                                  } else {
                                    setFormAssignedStaffIds([...formAssignedStaffIds, String(s.id)]);
                                  }
                                }}
                                className={\`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs \${
                                  isChecked
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "hover:bg-muted"
                                }\`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => {}}
                                    className="h-3.5 w-3.5"
                                  />
                                  <User className={\`w-3.5 h-3.5 shrink-0 \${isChecked ? "text-primary" : "text-muted-foreground"}\`} />
                                  <span className="font-semibold text-foreground truncate block">
                                    {s.name}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50 capitalize ml-2">
                                  {s.role || "Staff Member"}
                                </Badge>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Staff Chips */}
                {formAssignedStaffIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dialogStaffList
                      .filter((s) => formAssignedStaffIds.includes(String(s.id)))
                      .map((s) => (
                        <Badge
                          key={s.id}
                          variant="secondary"
                          className="text-[11px] py-1 pl-2 pr-1.5 gap-1.5 font-medium bg-muted/60 hover:bg-muted"
                        >
                          <User className="w-3 h-3 text-primary" />
                          <span className="truncate max-w-[150px]">{s.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => id !== String(s.id)));
                            }}
                            className="hover:bg-muted-foreground/20 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              {/* Project Scope / Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Scope & Deliverables (Optional)</Label>
                <Textarea
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="Describe project requirements, milestones, client specifications..."
                  className="text-xs min-h-[70px] resize-y"
                />
              </div>

              {/* Task Cadence / Frequency Selector */}
              {!isInstitutionAdmin && (
                <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Project Cadence *
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Daily vs One-Time</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsDailyRecurring(false)}
                      className={\`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all \${
                        !formIsDailyRecurring
                          ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                          : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                      }\`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        ⚡ Standard Project
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Deliverable workflow with milestones and sub-tasks.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormIsDailyRecurring(true)}
                      className={\`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all \${
                        formIsDailyRecurring
                          ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                          : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                      }\`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        🔁 Daily Recurring
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Regenerates daily with routine checks.
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3.5 border-t bg-muted/20 shrink-0">
              <ProgressiveSaveIndicator status={taskSaveStatus} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTaskDialogOpen(false);
                    clearTaskDraft();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingTask || uploadingAgreement} className="bg-primary font-bold">
                  {savingTask && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTask ? "Save Project Changes" : "Create Project & Continue to Sub-Tasks"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      `;

code = code.substring(0, startIndex) + newModalCode + code.substring(endIndex);
fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Successfully updated operations tasks page with full multi-client modal!');

