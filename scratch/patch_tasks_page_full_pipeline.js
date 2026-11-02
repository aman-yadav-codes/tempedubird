const fs = require('fs');

let fileContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');
const isCRLF = fileContent.includes('\r\n');
if (isCRLF) {
  fileContent = fileContent.replace(/\r\n/g, '\n');
}

// 1. Add icons to lucide-react import
if (!fileContent.includes('FolderKanban,') && !fileContent.includes('FolderKanban }')) {
  fileContent = fileContent.replace(
    '  Crown,\n} from "lucide-react";',
    '  Crown,\n  FolderKanban,\n  GitFork,\n  Star,\n  Play,\n  ArrowRightCircle,\n} from "lucide-react";'
  );
}

// 2. Add pipeline fields to OperationTask type
const targetTaskType = `  agreement_document_name?: string | null;
  base_price?: number | null;`;

const replacementTaskType = `  agreement_document_name?: string | null;
  project_type_id?: number | null;
  project_type_name?: string | null;
  pipeline_id?: number | null;
  pipeline_name?: string | null;
  pipeline_phases?: Array<{
    id: string;
    name: string;
    description?: string;
    order: number;
    estimated_duration_hours?: number;
    assigned_role?: string;
    is_mandatory?: boolean;
    requires_approval?: boolean;
    status?: "not_started" | "in_progress" | "under_review" | "completed" | "on_hold" | "failed" | "cancelled";
    started_at?: string | null;
    completed_at?: string | null;
    notes?: string;
  }>;
  current_phase_index?: number;
  base_price?: number | null;`;

if (!fileContent.includes(targetTaskType)) {
  console.error("Target Task Type not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetTaskType, replacementTaskType);

// 3. Add state variables inside OperationsTasksContent
const targetState = `  const [formAgreementDocUrl, setFormAgreementDocUrl] = useState("");
  const [formAgreementDocName, setFormAgreementDocName] = useState("");
  const [uploadingAgreement, setUploadingAgreement] = useState(false);`;

const replacementState = `  const [formAgreementDocUrl, setFormAgreementDocUrl] = useState("");
  const [formAgreementDocName, setFormAgreementDocName] = useState("");
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  // Project Types & Pipelines for Project Creation
  const [projectTypesList, setProjectTypesList] = useState<any[]>([]);
  const [formProjectTypeId, setFormProjectTypeId] = useState<string>("none");
  const [formProjectTypeName, setFormProjectTypeName] = useState<string>("");
  const [formPipelineId, setFormPipelineId] = useState<string>("none");
  const [formPipelineName, setFormPipelineName] = useState<string>("");
  const [availablePipelines, setAvailablePipelines] = useState<any[]>([]);
  const [formPipelinePhases, setFormPipelinePhases] = useState<any[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState<boolean>(false);

  const fetchProjectTypesForModal = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/project-types?status=active");
      if (res.ok) {
        const json = await res.json();
        setProjectTypesList(json.project_types || []);
      }
    } catch (e) {
      console.warn("fetchProjectTypesForModal error:", e);
    }
  }, []);

  const handleSelectProjectType = async (typeIdStr: string) => {
    setFormProjectTypeId(typeIdStr);
    if (typeIdStr === "none" || !typeIdStr) {
      setFormProjectTypeName("");
      setFormPipelineId("none");
      setFormPipelineName("");
      setAvailablePipelines([]);
      setFormPipelinePhases([]);
      return;
    }
    const pt = projectTypesList.find((p) => String(p.id) === String(typeIdStr));
    setFormProjectTypeName(pt ? pt.name : "");
    try {
      setLoadingPipelines(true);
      const res = await fetch(\`/api/admin/operations/project-pipelines?project_type_id=\${typeIdStr}&status=active\`);
      if (res.ok) {
        const json = await res.json();
        const pls: any[] = json.pipelines || [];
        setAvailablePipelines(pls);
        const defaultPl = pls.find((p) => p.is_default) || pls[0];
        if (defaultPl) {
          setFormPipelineId(String(defaultPl.id));
          setFormPipelineName(defaultPl.name);
          setFormPipelinePhases(Array.isArray(defaultPl.phases) ? defaultPl.phases : []);
        } else {
          setFormPipelineId("none");
          setFormPipelineName("");
          setFormPipelinePhases([]);
        }
      }
    } catch (err) {
      console.warn("Failed to load pipelines for type:", err);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const handleSelectPipeline = (pipelineIdStr: string) => {
    setFormPipelineId(pipelineIdStr);
    if (pipelineIdStr === "none" || !pipelineIdStr) {
      setFormPipelineName("");
      setFormPipelinePhases([]);
      return;
    }
    const pl = availablePipelines.find((p) => String(p.id) === String(pipelineIdStr));
    if (pl) {
      setFormPipelineName(pl.name);
      setFormPipelinePhases(Array.isArray(pl.phases) ? pl.phases : []);
    }
  };

  const handleUpdateProjectPhase = async (
    task: OperationTask,
    phaseIndex: number,
    newStatus: string,
    advanceNext: boolean = false
  ) => {
    try {
      const currentPhases = Array.isArray(task.pipeline_phases) ? [...task.pipeline_phases] : [];
      if (!currentPhases[phaseIndex]) return;

      currentPhases[phaseIndex] = {
        ...currentPhases[phaseIndex],
        status: newStatus as any,
        started_at: newStatus === "in_progress" && !currentPhases[phaseIndex].started_at ? new Date().toISOString() : currentPhases[phaseIndex].started_at,
        completed_at: newStatus === "completed" ? new Date().toISOString() : currentPhases[phaseIndex].completed_at,
      };

      let newCurrentIndex = task.current_phase_index || 0;
      if (advanceNext && phaseIndex + 1 < currentPhases.length) {
        newCurrentIndex = phaseIndex + 1;
        if (currentPhases[newCurrentIndex].status === "not_started") {
          currentPhases[newCurrentIndex].status = "in_progress";
          currentPhases[newCurrentIndex].started_at = new Date().toISOString();
        }
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: task.id,
          pipeline_phases: currentPhases,
          current_phase_index: newCurrentIndex,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update phase status");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, pipeline_phases: currentPhases, current_phase_index: newCurrentIndex }
            : t
        )
      );

      toast.success(
        advanceNext
          ? \`Advanced to next phase: "\${currentPhases[newCurrentIndex]?.name}"\`
          : \`Phase "\${currentPhases[phaseIndex]?.name}" status updated to \${newStatus}\`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update phase");
    }
  };`;

if (!fileContent.includes(targetState)) {
  console.error("Target State not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetState, replacementState);

// 4. In handleOpenCreateTask, reset pipeline form fields
const targetCreateOpen = `    setFormIsDailyRecurring(false);
    setFormPoints("20");
    setFormPenaltyPoints("10");
    setTaskDialogOpen(true);`;

const replacementCreateOpen = `    setFormIsDailyRecurring(false);
    setFormPoints("20");
    setFormPenaltyPoints("10");
    setFormProjectTypeId("none");
    setFormProjectTypeName("");
    setFormPipelineId("none");
    setFormPipelineName("");
    setAvailablePipelines([]);
    setFormPipelinePhases([]);
    void fetchProjectTypesForModal();
    setTaskDialogOpen(true);`;

if (!fileContent.includes(targetCreateOpen)) {
  console.error("Target Create Open not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetCreateOpen, replacementCreateOpen);

// 5. In handleOpenEditTask, set pipeline form fields
const targetEditOpen = `    setFormPoints(t.points !== undefined ? String(t.points) : "20");
    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
    setTaskDialogOpen(true);`;

const replacementEditOpen = `    setFormPoints(t.points !== undefined ? String(t.points) : "20");
    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
    setFormProjectTypeId(t.project_type_id ? String(t.project_type_id) : "none");
    setFormProjectTypeName(t.project_type_name || "");
    setFormPipelineId(t.pipeline_id ? String(t.pipeline_id) : "none");
    setFormPipelineName(t.pipeline_name || "");
    setFormPipelinePhases(Array.isArray(t.pipeline_phases) ? t.pipeline_phases : []);
    void fetchProjectTypesForModal();
    if (t.project_type_id) {
      void (async () => {
        try {
          const res = await fetch(\`/api/admin/operations/project-pipelines?project_type_id=\${t.project_type_id}&status=active\`);
          if (res.ok) {
            const json = await res.json();
            setAvailablePipelines(json.pipelines || []);
          }
        } catch {}
      })();
    }
    setTaskDialogOpen(true);`;

if (!fileContent.includes(targetEditOpen)) {
  console.error("Target Edit Open not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetEditOpen, replacementEditOpen);

// 6. In handleSaveMainTask, send pipeline fields
const targetSavePayload = `          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],`;

const replacementSavePayload = `          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
          project_type_id: formProjectTypeId !== "none" ? parseInt(formProjectTypeId) : null,
          project_type_name: formProjectTypeName.trim() || null,
          pipeline_id: formPipelineId !== "none" ? parseInt(formPipelineId) : null,
          pipeline_name: formPipelineName.trim() || null,
          pipeline_phases: formPipelinePhases,`;

if (!fileContent.includes(targetSavePayload)) {
  console.error("Target Save Payload not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetSavePayload, replacementSavePayload);

// 7. In Modal 1 (Create/Edit Project), render Project Type & Pipeline Template inputs after Project Name
const targetModalInputs = `              {/* Project Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. EduBird LMS Portal Redesign, Enterprise Cloud Migration"
                  className="text-xs h-9"
                />
              </div>`;

const replacementModalInputs = `              {/* Project Name */}
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

              {/* Project Type & Pipeline Template Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border bg-muted/20">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-primary" />
                      Project Type
                    </Label>
                    <Link
                      href="/admin/operations/project-types"
                      target="_blank"
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Manage Types
                    </Link>
                  </div>
                  <select
                    value={formProjectTypeId}
                    onChange={(e) => handleSelectProjectType(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                  >
                    <option value="none">-- Select Project Type --</option>
                    {projectTypesList.map((pt) => (
                      <option key={pt.id} value={String(pt.id)}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-primary" />
                      Pipeline Template
                    </Label>
                    <Link
                      href="/admin/operations/project-pipelines"
                      target="_blank"
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Manage Pipelines
                    </Link>
                  </div>
                  <select
                    value={formPipelineId}
                    disabled={formProjectTypeId === "none" || availablePipelines.length === 0}
                    onChange={(e) => handleSelectPipeline(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="none">
                      {formProjectTypeId === "none"
                        ? "-- Select Project Type First --"
                        : availablePipelines.length === 0
                        ? "-- No Active Pipelines for this Type --"
                        : "-- Select Pipeline Template --"}
                    </option>
                    {availablePipelines.map((pl) => (
                      <option key={pl.id} value={String(pl.id)}>
                        {pl.name} {pl.is_default ? "★ (Default)" : ""} ({Array.isArray(pl.phases) ? pl.phases.length : 0} phases)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Phases Preview */}
                {formPipelinePhases.length > 0 && (
                  <div className="sm:col-span-2 space-y-1.5 pt-1 border-t mt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3 text-primary" />
                        Pipeline Snapshot: {formPipelinePhases.length} Phases
                      </span>
                      <span className="font-mono text-[10px]">
                        Total Est: {formPipelinePhases.reduce((acc, p) => acc + (parseFloat(String(p.estimated_duration_hours || 0)) || 0), 0)}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                      {formPipelinePhases.map((ph, idx) => (
                        <div
                          key={ph.id || idx}
                          className="flex items-center gap-1 text-[10px] bg-background border px-2 py-1 rounded-md shrink-0 shadow-2xs"
                        >
                          <span className="font-mono font-bold text-primary">{idx + 1}.</span>
                          <span className="font-medium text-foreground max-w-[120px] truncate" title={ph.name}>
                            {ph.name}
                          </span>
                          {ph.requires_approval && (
                            <span className="text-[9px] text-amber-600 bg-amber-500/15 px-1 rounded font-semibold">
                              Approval
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>`;

if (!fileContent.includes(targetModalInputs)) {
  console.error("Target Modal Inputs not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetModalInputs, replacementModalInputs);

// 8. On Project Card: render Pipeline Instance Workflow right above Sub-Tasks List
const targetCardSubtasks = `                  {/* Full-Width Sub-Tasks List */}
                  <div className="space-y-2 pt-1 border-t">`;

const replacementCardSubtasks = `                  {/* Project Pipeline Instance Workflow (if attached) */}
                  {Array.isArray(task.pipeline_phases) && task.pipeline_phases.length > 0 && (() => {
                    const phases = task.pipeline_phases;
                    const currentIndex = task.current_phase_index ?? 0;
                    const completedPhasesCount = phases.filter((p) => p.status === "completed").length;
                    const currentPhase = phases[currentIndex] || phases[0];

                    return (
                      <div className="space-y-2.5 p-3.5 bg-muted/25 rounded-xl border text-xs">
                        {/* Pipeline Header Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                              <GitFork className="w-3.5 h-3.5 text-primary" />
                              {task.pipeline_name || "Project Pipeline"}
                            </span>
                            {task.project_type_name && (
                              <Badge variant="outline" className="text-[10px] bg-background font-semibold gap-1 py-0 px-2">
                                <FolderKanban className="w-2.5 h-2.5 text-primary" />
                                {task.project_type_name}
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold py-0 px-2 bg-primary/10 text-primary"
                            >
                              Phase {currentIndex + 1} of {phases.length}: {currentPhase?.name || "In Progress"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                            <span className="font-semibold text-foreground">
                              {completedPhasesCount}/{phases.length} Phases Done
                            </span>
                            <div className="w-16 bg-muted h-2 rounded-full overflow-hidden border">
                              <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: \`\${(completedPhasesCount / phases.length) * 100}%\` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Phase Sequence Stepper */}
                        <div className="flex items-center gap-2 overflow-x-auto py-1.5 no-scrollbar">
                          {phases.map((ph, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isDone = ph.status === "completed";
                            const isReview = ph.status === "under_review";
                            const isInProg = ph.status === "in_progress";

                            return (
                              <div key={ph.id || idx} className="flex items-center gap-2 shrink-0">
                                <div
                                  className={\`flex flex-col rounded-lg p-2.5 min-w-[170px] max-w-[200px] border shadow-2xs transition-all \${
                                    isCurrent
                                      ? "bg-card border-primary ring-1 ring-primary/40"
                                      : isDone
                                      ? "bg-emerald-500/5 border-emerald-500/30"
                                      : "bg-card border-border opacity-85"
                                  }\`}
                                >
                                  {/* Step number and status selector */}
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={\`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded \${
                                        isDone
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                          : isCurrent
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground"
                                      }\`}
                                    >
                                      #{idx + 1}
                                    </span>

                                    {/* Phase Status Select (admin / leader) */}
                                    {canEditOrRemove ? (
                                      <select
                                        value={ph.status || "not_started"}
                                        onChange={(e) => handleUpdateProjectPhase(task, idx, e.target.value)}
                                        className="h-5 text-[9px] font-bold rounded bg-background border px-1 outline-none cursor-pointer"
                                        title="Change phase status"
                                      >
                                        <option value="not_started">Not Started</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="completed">Completed</option>
                                        <option value="on_hold">On Hold</option>
                                        <option value="failed">Failed</option>
                                        <option value="cancelled">Cancelled</option>
                                      </select>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className={\`text-[9px] px-1 py-0 capitalize \${
                                          isDone
                                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                            : isInProg
                                            ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                                            : "bg-muted text-muted-foreground"
                                        }\`}
                                      >
                                        {ph.status || "not_started"}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Phase Title */}
                                  <span
                                    className={\`text-xs font-bold truncate \${
                                      isDone ? "text-emerald-800 dark:text-emerald-300 line-through opacity-80" : "text-foreground"
                                    }\`}
                                    title={ph.name}
                                  >
                                    {ph.name}
                                  </span>

                                  {/* Role & Duration */}
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 pt-1 border-t">
                                    <span className="truncate max-w-[95px]" title={ph.assigned_role || "Any"}>
                                      {ph.assigned_role || "Role: Unassigned"}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      {ph.estimated_duration_hours ? \`\${ph.estimated_duration_hours}h\` : "—"}
                                    </span>
                                  </div>

                                  {/* Quick Action buttons for current phase */}
                                  {canEditOrRemove && isCurrent && (
                                    <div className="pt-1.5 flex items-center gap-1">
                                      {ph.requires_approval && isReview ? (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full bg-amber-600 hover:bg-amber-700 text-white py-0 px-1.5 gap-1"
                                          title="Approve this phase and advance to next phase"
                                        >
                                          <Check className="w-2.5 h-2.5" /> Approve Phase
                                        </Button>
                                      ) : isDone && idx + 1 < phases.length ? (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full bg-primary hover:bg-primary/90 text-primary-foreground py-0 px-1.5 gap-1"
                                        >
                                          Next Phase <ArrowRight className="w-2.5 h-2.5" />
                                        </Button>
                                      ) : !isDone ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 py-0 px-1.5 gap-1"
                                        >
                                          <Check className="w-2.5 h-2.5 text-emerald-600" /> Mark Complete
                                        </Button>
                                      ) : null}
                                    </div>
                                  )}
                                </div>

                                {idx < phases.length - 1 && (
                                  <ArrowRight
                                    className={\`w-3.5 h-3.5 shrink-0 \${
                                      idx < currentIndex ? "text-emerald-500" : "text-muted-foreground/30"
                                    }\`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Full-Width Sub-Tasks List */}
                  <div className="space-y-2 pt-1 border-t">`;

if (!fileContent.includes(targetCardSubtasks)) {
  console.error("Target Card Subtasks not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetCardSubtasks, replacementCardSubtasks);

if (isCRLF) {
  fileContent = fileContent.replace(/\n/g, '\r\n');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', fileContent, 'utf8');
console.log('Successfully patched app/admin/operations/tasks/page.tsx with full pipeline support!');

