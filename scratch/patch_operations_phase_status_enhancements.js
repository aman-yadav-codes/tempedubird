const fs = require('fs');

let fileContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');
const isCRLF = fileContent.includes('\r\n');
if (isCRLF) {
  fileContent = fileContent.replace(/\r\n/g, '\n');
}

// 1. Ensure icons are imported
const targetIcons = `  Crown,
  Check,
  FolderKanban,
  GitFork,
  Star,
  Play,
  ArrowRightCircle,`;

const replacementIcons = `  Crown,
  Check,
  FolderKanban,
  GitFork,
  Star,
  Play,
  Pause,
  Slash,
  Circle,
  ArrowRightCircle,`;

if (fileContent.includes(targetIcons)) {
  fileContent = fileContent.replace(targetIcons, replacementIcons);
}

// 2. Add phase modal state & attach pipeline state
const targetStateAnchor = `  // Project Types & Pipelines for Project Creation
  const [projectTypesList, setProjectTypesList] = useState<any[]>([]);`;

const extraPhaseState = `  // Dedicated Phase Status & Details Modal State
  const [phaseModalState, setPhaseModalState] = useState<{
    task: OperationTask;
    phaseIndex: number;
    phase: any;
  } | null>(null);
  const [phaseModalStatus, setPhaseModalStatus] = useState<string>("not_started");
  const [phaseModalNotes, setPhaseModalNotes] = useState<string>("");
  const [phaseModalAdvanceNext, setPhaseModalAdvanceNext] = useState<boolean>(true);
  const [savingPhaseModal, setSavingPhaseModal] = useState<boolean>(false);

  // Quick Attach Pipeline Modal State for existing projects
  const [attachPipelineTask, setAttachPipelineTask] = useState<OperationTask | null>(null);
  const [attachTypeId, setAttachTypeId] = useState<string>("none");
  const [attachPipelineId, setAttachPipelineId] = useState<string>("none");
  const [attachAvailablePipelines, setAttachAvailablePipelines] = useState<any[]>([]);
  const [savingAttachPipeline, setSavingAttachPipeline] = useState<boolean>(false);
`;

if (!fileContent.includes('const [phaseModalState, setPhaseModalState]')) {
  fileContent = fileContent.replace(targetStateAnchor, extraPhaseState + targetStateAnchor);
}

// 3. Update handleUpdateProjectPhase to accept notes
const targetUpdatePhase = `  const handleUpdateProjectPhase = async (
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
      };`;

const replacementUpdatePhase = `  const handleUpdateProjectPhase = async (
    task: OperationTask,
    phaseIndex: number,
    newStatus: string,
    advanceNext: boolean = false,
    notes?: string
  ) => {
    try {
      const currentPhases = Array.isArray(task.pipeline_phases) ? [...task.pipeline_phases] : [];
      if (!currentPhases[phaseIndex]) return;

      currentPhases[phaseIndex] = {
        ...currentPhases[phaseIndex],
        status: newStatus as any,
        notes: notes !== undefined ? notes : currentPhases[phaseIndex].notes || "",
        started_at: newStatus === "in_progress" && !currentPhases[phaseIndex].started_at ? new Date().toISOString() : currentPhases[phaseIndex].started_at,
        completed_at: newStatus === "completed" ? new Date().toISOString() : currentPhases[phaseIndex].completed_at,
      };`;

if (fileContent.includes(targetUpdatePhase)) {
  fileContent = fileContent.replace(targetUpdatePhase, replacementUpdatePhase);
}

// 4. Update Header Buttons in Operations
const targetHeaderButtons = `        {!(isClientRole || Boolean(pathname?.startsWith("/client"))) && (
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleOpenCreateTask} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5 h-9">
              <Plus className="w-4 h-4" /> Create Task / Project
            </Button>
          </div>
        )}`;

const replacementHeaderButtons = `        {!(isClientRole || Boolean(pathname?.startsWith("/client"))) && (() => {
          const opsBasePath = pathname?.startsWith("/platformadmin") ? "/platformadmin/operations" : "/admin/operations";
          return (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link href={\`\${opsBasePath}/project-types\`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold gap-1.5 border hover:bg-muted/60 transition-colors shadow-2xs"
                  title="Configure and manage project types"
                >
                  <FolderKanban className="w-4 h-4 text-primary" />
                  <span>Project Types</span>
                </Button>
              </Link>

              <Link href={\`\${opsBasePath}/project-pipelines\`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold gap-1.5 border hover:bg-muted/60 transition-colors shadow-2xs"
                  title="Design and manage project pipeline templates"
                >
                  <GitFork className="w-4 h-4 text-primary" />
                  <span>Project Pipelines</span>
                </Button>
              </Link>

              <Button
                onClick={handleOpenCreateTask}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5 h-9 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Task / Project
              </Button>
            </div>
          );
        })()}`;

if (fileContent.includes(targetHeaderButtons)) {
  fileContent = fileContent.replace(targetHeaderButtons, replacementHeaderButtons);
}

// 5. Replace Phase Card Block using line indices
const lines = fileContent.split('\n');
const startIdx = lines.findIndex(l => l.includes('{/* Project Pipeline Instance Workflow (if attached) */}'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('{/* Full-Width Sub-Tasks List */}'));

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find startIdx or endIdx for phase card block");
  process.exit(1);
}

const replacementPhaseCardLines = `                  {/* Project Pipeline Instance Workflow (if attached) */}
                  {Array.isArray(task.pipeline_phases) && task.pipeline_phases.length > 0 ? (() => {
                    const phases = task.pipeline_phases;
                    const currentIndex = task.current_phase_index ?? 0;
                    const completedPhasesCount = phases.filter((p) => p.status === "completed").length;
                    const currentPhase = phases[currentIndex] || phases[0];

                    const getPhaseStatusBadgeInfo = (st?: string) => {
                      switch (st) {
                        case "completed":
                          return { label: "Completed", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500" };
                        case "in_progress":
                          return { label: "In Progress", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30", dot: "bg-blue-500 animate-pulse" };
                        case "under_review":
                          return { label: "Under Review", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40", dot: "bg-amber-500" };
                        case "on_hold":
                          return { label: "On Hold", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30", dot: "bg-orange-500" };
                        case "failed":
                          return { label: "Failed", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", dot: "bg-rose-500" };
                        case "cancelled":
                          return { label: "Cancelled", bg: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30", dot: "bg-zinc-500" };
                        default:
                          return { label: "Not Started", bg: "bg-muted/80 text-muted-foreground border-border", dot: "bg-muted-foreground/40" };
                      }
                    };

                    return (
                      <div className="space-y-3 p-3.5 bg-muted/25 rounded-xl border text-xs">
                        {/* Pipeline Header Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                              <GitFork className="w-4 h-4 text-primary" />
                              {task.pipeline_name || "Project Pipeline"}
                            </span>
                            {task.project_type_name && (
                              <Badge variant="outline" className="text-[10px] bg-background font-semibold gap-1 py-0.5 px-2">
                                <FolderKanban className="w-3 h-3 text-primary" />
                                {task.project_type_name}
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold py-0.5 px-2.5 bg-primary/10 text-primary border border-primary/20"
                            >
                              Phase {currentIndex + 1} of {phases.length}: {currentPhase?.name || "In Progress"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="font-mono font-semibold text-foreground">
                              {completedPhasesCount}/{phases.length} Phases Done
                            </span>
                            <div className="w-20 bg-muted h-2.5 rounded-full overflow-hidden border">
                              <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: \`\${(completedPhasesCount / phases.length) * 100}%\` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Phase Sequence Stepper */}
                        <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
                          {phases.map((ph, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isDone = ph.status === "completed";
                            const isReview = ph.status === "under_review";
                            const statusInfo = getPhaseStatusBadgeInfo(ph.status);

                            return (
                              <div key={ph.id || idx} className="flex items-center gap-2 shrink-0">
                                <div
                                  className={\`flex flex-col rounded-xl p-3 min-w-[200px] max-w-[220px] border shadow-2xs transition-all \${
                                    isCurrent
                                      ? "bg-card border-primary ring-2 ring-primary/30"
                                      : isDone
                                      ? "bg-emerald-500/5 border-emerald-500/30"
                                      : "bg-card border-border hover:border-input"
                                  }\`}
                                >
                                  {/* Step number & Phase Status Dropdown */}
                                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span
                                      className={\`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md \${
                                        isDone
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                          : isCurrent
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground"
                                      }\`}
                                    >
                                      Step {idx + 1}
                                    </span>

                                    {/* Prominent Phase Status Change Dropdown */}
                                    {canEditOrRemove ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            className={\`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer shadow-2xs \${statusInfo.bg}\`}
                                            title="Click to change phase status"
                                          >
                                            <span className={\`w-1.5 h-1.5 rounded-full \${statusInfo.dot}\`} />
                                            <span>{statusInfo.label}</span>
                                            <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "not_started")}
                                            className="gap-2 cursor-pointer text-xs"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                                            <span>Not Started</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "in_progress")}
                                            className="gap-2 cursor-pointer text-xs text-blue-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span>In Progress</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "under_review")}
                                            className="gap-2 cursor-pointer text-xs text-amber-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span>Under Review</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "completed")}
                                            className="gap-2 cursor-pointer text-xs text-emerald-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>Completed</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "on_hold")}
                                            className="gap-2 cursor-pointer text-xs text-orange-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                                            <span>On Hold</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "failed")}
                                            className="gap-2 cursor-pointer text-xs text-rose-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span>Failed</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "cancelled")}
                                            className="gap-2 cursor-pointer text-xs text-muted-foreground font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                                            <span>Cancelled</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setPhaseModalState({ task, phaseIndex: idx, phase: ph });
                                              setPhaseModalStatus(ph.status || "not_started");
                                              setPhaseModalNotes(ph.notes || "");
                                              setPhaseModalAdvanceNext(true);
                                            }}
                                            className="gap-2 cursor-pointer text-xs text-primary font-bold"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            <span>Phase Details & Notes...</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className={\`text-[10px] px-2 py-0.5 font-semibold \${statusInfo.bg}\`}
                                      >
                                        <span className={\`w-1.5 h-1.5 rounded-full mr-1 \${statusInfo.dot}\`} />
                                        {statusInfo.label}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Phase Title */}
                                  <span
                                    className={\`text-xs font-bold leading-tight line-clamp-1 \${
                                      isDone ? "text-emerald-800 dark:text-emerald-300 line-through opacity-80" : "text-foreground"
                                    }\`}
                                    title={ph.name}
                                  >
                                    {ph.name}
                                  </span>

                                  {/* Role & Duration */}
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t">
                                    <span className="truncate max-w-[105px]" title={ph.assigned_role || "Role: Unassigned"}>
                                      {ph.assigned_role || "Any"}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      {ph.estimated_duration_hours ? \`\${ph.estimated_duration_hours}h\` : "—"}
                                    </span>
                                  </div>

                                  {/* Quick Action buttons for current phase */}
                                  {canEditOrRemove && isCurrent && (
                                    <div className="pt-2 flex items-center gap-1.5">
                                      {ph.requires_approval && isReview ? (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full bg-amber-600 hover:bg-amber-700 text-white py-0 px-2 gap-1 shadow-2xs"
                                          title="Approve this phase and advance to next phase"
                                        >
                                          <Check className="w-3 h-3" /> Approve Phase
                                        </Button>
                                      ) : isDone && idx + 1 < phases.length ? (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full bg-primary hover:bg-primary/90 text-primary-foreground py-0 px-2 gap-1 shadow-2xs"
                                        >
                                          Next Phase <ArrowRight className="w-3 h-3" />
                                        </Button>
                                      ) : !isDone ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 py-0 px-2 gap-1"
                                        >
                                          <Check className="w-3 h-3 text-emerald-600" /> Mark Complete
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
                  })() : canEditOrRemove && (
                    <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-xl border border-dashed text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GitFork className="w-4 h-4 text-primary opacity-60" />
                        <span>No pipeline workflow assigned to this project yet.</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAttachPipelineTask(task);
                          setAttachTypeId("none");
                          setAttachPipelineId("none");
                          setAttachAvailablePipelines([]);
                          void fetchProjectTypesForModal();
                        }}
                        className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <Plus className="w-3 h-3" /> Assign Pipeline
                      </Button>
                    </div>
                  )}
`;

lines.splice(startIdx, endIdx - startIdx, replacementPhaseCardLines);
fileContent = lines.join('\n');

// 6. Add Phase Details Modal Dialog and Attach Pipeline Dialog before closing
const targetDialogClosing = `      {/* Unified Sub-Tasks Add & Edit Dialog */}`;

const phaseModalsCode = `      {/* MODAL: Phase Status & Details Modal */}
      <Dialog open={Boolean(phaseModalState)} onOpenChange={(open) => !open && setPhaseModalState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="w-5 h-5 text-primary" />
              <span>Change Phase Status & Notes</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Project: <strong>{phaseModalState?.task.title}</strong>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Phase #{Number(phaseModalState?.phaseIndex ?? 0) + 1}: {phaseModalState?.phase?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          {phaseModalState && (
            <div className="space-y-4 py-1 text-xs">
              {/* Selectable Phase Status Grid */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Phase Status</Label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { id: "not_started", label: "Not Started", color: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-200" },
                    { id: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200" },
                    { id: "under_review", label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200" },
                    { id: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200" },
                    { id: "on_hold", label: "On Hold", color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200" },
                    { id: "failed", label: "Failed", color: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPhaseModalStatus(s.id)}
                      className={\`flex items-center gap-2 p-2 rounded-lg border text-left font-semibold text-xs transition-all cursor-pointer \${
                        phaseModalStatus === s.id
                          ? \`\${s.color} ring-2 ring-primary shadow-xs font-bold\`
                          : "bg-background border-border text-muted-foreground hover:bg-muted/40"
                      }\`}
                    >
                      <span className={\`w-2 h-2 rounded-full \${phaseModalStatus === s.id ? "bg-primary" : "bg-muted-foreground/40"}\`} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase Notes & Updates */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Phase Deliverables & Notes</Label>
                <Textarea
                  value={phaseModalNotes}
                  onChange={(e) => setPhaseModalNotes(e.target.value)}
                  placeholder="Record deliverable status, client approvals, or instructions for this phase..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              {/* Advance Next Phase Toggle */}
              {phaseModalStatus === "completed" && (
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-muted/30 p-2.5 rounded-lg border">
                  <input
                    type="checkbox"
                    checked={phaseModalAdvanceNext}
                    onChange={(e) => setPhaseModalAdvanceNext(e.target.checked)}
                    className="rounded border-input text-primary h-4 w-4"
                  />
                  <span>Automatically advance project to next phase</span>
                </label>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPhaseModalState(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingPhaseModal}
              onClick={async () => {
                if (!phaseModalState) return;
                setSavingPhaseModal(true);
                await handleUpdateProjectPhase(
                  phaseModalState.task,
                  phaseModalState.phaseIndex,
                  phaseModalStatus,
                  phaseModalStatus === "completed" && phaseModalAdvanceNext,
                  phaseModalNotes
                );
                setSavingPhaseModal(false);
                setPhaseModalState(null);
              }}
              className="bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Save Phase Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign Pipeline Workflow to Existing Project */}
      <Dialog open={Boolean(attachPipelineTask)} onOpenChange={(open) => !open && setAttachPipelineTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <GitFork className="w-5 h-5 text-primary" />
              <span>Assign Pipeline Workflow</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Project: <strong>{attachPipelineTask?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Project Type</Label>
              <select
                value={attachTypeId}
                onChange={async (e) => {
                  const tId = e.target.value;
                  setAttachTypeId(tId);
                  if (tId === "none") {
                    setAttachPipelineId("none");
                    setAttachAvailablePipelines([]);
                    return;
                  }
                  try {
                    const res = await fetch(\`/api/admin/operations/project-pipelines?project_type_id=\${tId}&status=active\`);
                    if (res.ok) {
                      const data = await res.json();
                      const pls = data.pipelines || [];
                      setAttachAvailablePipelines(pls);
                      const def = pls.find((p: any) => p.is_default) || pls[0];
                      if (def) setAttachPipelineId(String(def.id));
                    }
                  } catch (err) {
                    console.error("Error loading pipelines:", err);
                  }
                }}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium cursor-pointer"
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
              <Label className="text-xs font-bold">Select Pipeline Template</Label>
              <select
                value={attachPipelineId}
                disabled={attachTypeId === "none" || attachAvailablePipelines.length === 0}
                onChange={(e) => setAttachPipelineId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium cursor-pointer disabled:opacity-50"
              >
                <option value="none">
                  {attachTypeId === "none"
                    ? "-- Select Project Type First --"
                    : attachAvailablePipelines.length === 0
                    ? "-- No active pipelines --"
                    : "-- Select Pipeline Template --"}
                </option>
                {attachAvailablePipelines.map((pl) => (
                  <option key={pl.id} value={String(pl.id)}>
                    {pl.name} {pl.is_default ? "★ (Default)" : ""} ({Array.isArray(pl.phases) ? pl.phases.length : 0} phases)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAttachPipelineTask(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingAttachPipeline || attachPipelineId === "none"}
              onClick={async () => {
                if (!attachPipelineTask || attachPipelineId === "none") return;
                setSavingAttachPipeline(true);
                try {
                  const selType = projectTypesList.find((p) => String(p.id) === String(attachTypeId));
                  const selPl = attachAvailablePipelines.find((p) => String(p.id) === String(attachPipelineId));
                  const plPhases = Array.isArray(selPl?.phases) ? selPl.phases : [];

                  const headers: Record<string, string> = { "Content-Type": "application/json" };
                  if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

                  const res = await fetch("/api/admin/operations/tasks", {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({
                      id: attachPipelineTask.id,
                      project_type_id: selType?.id || null,
                      project_type_name: selType?.name || null,
                      pipeline_id: selPl?.id || null,
                      pipeline_name: selPl?.name || null,
                      pipeline_phases: plPhases.map((ph: any, i: number) => ({
                        ...ph,
                        order: ph.order || i + 1,
                        status: i === 0 ? "in_progress" : "not_started",
                        started_at: i === 0 ? new Date().toISOString() : null,
                        completed_at: null,
                      })),
                      current_phase_index: 0,
                    }),
                  });

                  if (!res.ok) throw new Error("Failed to assign pipeline");
                  toast.success(\`Pipeline "\${selPl?.name}" assigned to project!\`);
                  setAttachPipelineTask(null);
                  await fetchTasks();
                } catch (err: any) {
                  toast.error(err.message || "Failed to assign pipeline");
                } finally {
                  setSavingAttachPipeline(false);
                }
              }}
              className="bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              {savingAttachPipeline ? "Assigning..." : "Assign Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

`;

if (!fileContent.includes(targetDialogClosing)) {
  console.error("Target Dialog Closing not found!");
  process.exit(1);
}
fileContent = fileContent.replace(targetDialogClosing, phaseModalsCode + targetDialogClosing);

if (isCRLF) {
  fileContent = fileContent.replace(/\n/g, '\r\n');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', fileContent, 'utf8');
console.log('Successfully enhanced operations/tasks/page.tsx with phase status options and pipeline buttons!');
