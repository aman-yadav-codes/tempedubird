with open('app/admin/operations/tasks/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add ArrowLeft to lucide-react imports if not there
if 'ArrowLeft' not in text:
    text = text.replace('ArrowRight,', 'ArrowRight,\n  ArrowLeft,', 1)
    print("1. Added ArrowLeft import")

# 2. Add state variables for Subtasks Bulk Add
sub_states = '''  // Dedicated Sub-Tasks Manager Modal Bulk Add States
  const [subtaskAddMode, setSubtaskAddMode] = useState<"single" | "bulk">("single");
  const [bulkSubText, setBulkSubText] = useState("");
  const [bulkSubStripBullets, setBulkSubStripBullets] = useState(true);
  const [bulkSubDeduplicate, setBulkSubDeduplicate] = useState(true);
  const [bulkSubTasksList, setBulkSubTasksList] = useState<string[]>([]);
  const [bulkSubStep, setBulkSubStep] = useState<"paste" | "preview">("paste");

  const [bulkSubAssigneeId, setBulkSubAssigneeId] = useState("none");
  const [bulkSubUrgency, setBulkSubUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [bulkSubCadence, setBulkSubCadence] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [bulkSubDurationHours, setBulkSubDurationHours] = useState("1");
  const [bulkSubDurationMinutes, setBulkSubDurationMinutes] = useState("0");
  const [bulkSubDeadlineDate, setBulkSubDeadlineDate] = useState("");
  const [bulkSubDeadlineTime, setBulkSubDeadlineTime] = useState("18:00");
  const [bulkSubPrice, setBulkSubPrice] = useState("0");
  const [bulkSubSaving, setBulkSubSaving] = useState(false);
'''

state_marker = '  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);'
if state_marker in text and 'subtaskAddMode' not in text:
    text = text.replace(state_marker, state_marker + '\n' + sub_states, 1)
    print("2. Added Subtasks Bulk Add state variables")

# 3. Add parsing memo and handlers
handlers = '''  // Real-time detected subtasks counter & parser
  const parsedLiveSubtasks = useMemo(() => {
    const lines = bulkSubText.split(/\\r?\\n/);
    const seen = new Set<string>();
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (bulkSubStripBullets) {
        line = line.replace(/^(\\d+[\\.\\)]\\s*|[-*•]\\s*|\\[[\\sxX]?\\]\\s*)/, "").trim();
      }
      if (!line) continue;

      const normKey = line.toLowerCase();
      if (bulkSubDeduplicate && seen.has(normKey)) continue;
      seen.add(normKey);

      result.push(line);
    }
    return result;
  }, [bulkSubText, bulkSubStripBullets, bulkSubDeduplicate]);

  const handleProceedToSubtaskPreview = () => {
    if (parsedLiveSubtasks.length === 0) {
      toast.error("Please enter at least one task (one task per line)");
      return;
    }
    setBulkSubTasksList(parsedLiveSubtasks);
    setBulkSubStep("preview");
  };

  const handleCreateAllBulkSubtasks = async () => {
    const validTitles = bulkSubTasksList.map((t) => t.trim()).filter((t) => t.length > 0);
    if (validTitles.length === 0) {
      toast.error("Please provide at least one task title");
      return;
    }
    if (!selectedTaskForSubtasks) return;

    setBulkSubSaving(true);
    try {
      const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === bulkSubAssigneeId);
      const parsedHours = Math.max(0, parseInt(bulkSubDurationHours, 10) || 0);
      const parsedMins = Math.max(0, Math.min(59, parseInt(bulkSubDurationMinutes, 10) || 0));
      const isRecurring = bulkSubCadence !== "once";
      const now = Date.now();

      const newSubs: SubTask[] = validTitles.map((title, idx) => ({
        id: `sub_${now}_${idx}`,
        title,
        price: parseFloat(bulkSubPrice) || 0,
        assigned_employee_id: assignedStaff ? assignedStaff.id : (bulkSubAssigneeId !== "none" ? Number(bulkSubAssigneeId) : null),
        assigned_employee_name: assignedStaff ? assignedStaff.name : null,
        assigned_employee_role: assignedStaff ? assignedStaff.role : null,
        duration_hours: parsedHours,
        duration_minutes: parsedMins,
        points: 20,
        penalty_points: 10,
        deadline_date: !isRecurring ? (bulkSubDeadlineDate || null) : null,
        deadline_time: !isRecurring ? (bulkSubDeadlineTime || "18:00") : "10:00",
        daily_time: isRecurring ? "10:00" : null,
        urgency: bulkSubUrgency,
        status: "pending",
        is_daily_recurring: isRecurring,
        cadence: bulkSubCadence,
      }));

      const updated = [...newSubs, ...activeSubTasks];
      setActiveSubTasks(updated);

      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTaskForSubtasks.id ? { ...t, sub_tasks: updated } : t))
      );

      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
      toast.success(`🎉 Successfully created all ${newSubs.length} tasks!`);

      // Reset bulk state
      setBulkSubText("");
      setBulkSubTasksList([]);
      setBulkSubStep("paste");
      setSubtaskAddMode("single");
    } catch (err: any) {
      toast.error(err.message || "Failed to create tasks in bulk");
    } finally {
      setBulkSubSaving(false);
    }
  };
'''

handler_marker = '  // Add Sub-Task in Modal (Supports single or multi-line pasted deliverables)'
if handler_marker in text and 'handleCreateAllBulkSubtasks' not in text:
    text = text.replace(handler_marker, handlers + '\n' + handler_marker, 1)
    print("3. Added Bulk Subtask handlers")

# 4. In handleOpenSubtasksModal, set defaults for bulk fields
open_modal_old = '''    const defaultStaff = projectMembers.length === 1 ? String(projectMembers[0].id) : "none";
    resetSubtaskDraft(defaultStaff);
    setSubtaskModalOpen(true);'''

open_modal_new = '''    const defaultStaff = projectMembers.length === 1 ? String(projectMembers[0].id) : "none";
    resetSubtaskDraft(defaultStaff);
    setBulkSubAssigneeId(task.assigned_employee_id ? String(task.assigned_employee_id) : defaultStaff);
    setBulkSubDeadlineDate(task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "");
    setSubtaskAddMode("single");
    setBulkSubStep("paste");
    setBulkSubText("");
    setSubtaskModalOpen(true);'''

if open_modal_old in text:
    text = text.replace(open_modal_old, open_modal_new, 1)
    print("4. Updated handleOpenSubtasksModal defaults (LF)")
elif open_modal_old.replace('\n', '\r\n') in text:
    text = text.replace(open_modal_old.replace('\n', '\r\n'), open_modal_new.replace('\n', '\r\n'), 1)
    print("4. Updated handleOpenSubtasksModal defaults (CRLF)")
else:
    print("4. open_modal_old not found")

# 5. Replace Sub-Task Input Box in Modal 2 with Single / Bulk Toggle & Views
old_box_start = '{/* Sub-Task Input Box (Clean Title-only input: all details are editable directly from deliverable card) */}'
old_box_end = '{/* Deliverables notification tip */}'

idx_start = text.find(old_box_start)
idx_end = text.find(old_box_end)

if idx_start != -1 and idx_end != -1 and idx_end > idx_start:
    new_box_jsx = '''{/* Sub-Task Input Box: Switch between Single Deliverable and Bulk Add Tasks */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Add Deliverables / Tasks
                  </p>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-muted text-[11px] font-semibold border">
                    <button
                      type="button"
                      onClick={() => setSubtaskAddMode("single")}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        subtaskAddMode === "single"
                          ? "bg-background text-foreground shadow-2xs font-bold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Single Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtaskAddMode("bulk")}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                        subtaskAddMode === "bulk"
                          ? "bg-background text-foreground shadow-2xs font-bold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ListPlus className="w-3.5 h-3.5 text-primary" />
                      <span>Bulk Add Tasks</span>
                    </button>
                  </div>
                </div>

                <span className="text-[11px] text-muted-foreground">
                  {subtaskAddMode === "single"
                    ? "Add a single deliverable"
                    : "Paste 10, 50, or 100+ tasks at once (one per line)"}
                </span>
              </div>

              {subtaskAddMode === "single" ? (
                /* Single Add View */
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 pt-1">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs font-semibold">Sub-Task Name *</Label>
                    <Input
                      value={newSubTitle}
                      onChange={(e) => setNewSubTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubTaskToList();
                        }
                      }}
                      placeholder="e.g. Curriculum Design, Lab Environment Setup, Class Assignment"
                      className="text-xs h-9 bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSubTaskToList}
                    className="h-9 px-5 text-xs font-bold gap-1.5 shadow-sm shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Sub-Task to List
                  </Button>
                </div>
              ) : (
                /* Bulk Add View */
                <div className="space-y-3 pt-1">
                  {bulkSubStep === "paste" ? (
                    /* Step 1: Paste */
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground">
                            Paste Tasks List (One task per line) *
                          </Label>
                          <Badge
                            variant={parsedLiveSubtasks.length > 0 ? "default" : "secondary"}
                            className="text-xs font-bold px-2 py-0.5"
                          >
                            {parsedLiveSubtasks.length} Task{parsedLiveSubtasks.length === 1 ? "" : "s"} Detected
                          </Badge>
                        </div>
                        <Textarea
                          value={bulkSubText}
                          onChange={(e) => setBulkSubText(e.target.value)}
                          placeholder={`Fix login page responsive issue\\nUpdate homepage banner\\nCreate new restaurant category\\nCheck Google Search Console errors\\nOptimize listing page loading speed\\nFix mobile navigation menu`}
                          className="font-mono text-xs leading-relaxed min-h-[160px] p-3 resize-y bg-background"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40 border text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                            <input
                              type="checkbox"
                              checked={bulkSubStripBullets}
                              onChange={(e) => setBulkSubStripBullets(e.target.checked)}
                              className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                            <span>Clean bullet points & numbering (1., -, *)</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                            <input
                              type="checkbox"
                              checked={bulkSubDeduplicate}
                              onChange={(e) => setBulkSubDeduplicate(e.target.checked)}
                              className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                            <span>Remove duplicates</span>
                          </label>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleProceedToSubtaskPreview}
                          disabled={parsedLiveSubtasks.length === 0}
                          className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                        >
                          <span>Review {parsedLiveSubtasks.length} Tasks</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Review & Shared Configuration */
                    <div className="space-y-3">
                      {/* Shared Configuration Bar */}
                      <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-primary">
                            <Zap className="w-3.5 h-3.5" /> Shared Settings (Applied to all {bulkSubTasksList.length} tasks)
                          </span>
                          <span className="text-[10px] text-muted-foreground">Optional</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                          {/* Assignee */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Assignee</Label>
                            <select
                              value={bulkSubAssigneeId}
                              onChange={(e) => setBulkSubAssigneeId(e.target.value)}
                              className="w-full h-8 text-[11px] bg-background rounded border border-input px-2 font-medium cursor-pointer"
                            >
                              <option value="none">Unassigned</option>
                              {subtaskAssigneeOptions.map((s) => (
                                <option key={s.id} value={String(s.id)}>
                                  {s.name} ({s.role || "Staff"})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Urgency */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Urgency</Label>
                            <select
                              value={bulkSubUrgency}
                              onChange={(e) => setBulkSubUrgency(e.target.value as any)}
                              className="w-full h-8 text-[11px] bg-background rounded border border-input px-2 font-medium cursor-pointer"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>

                          {/* Cadence */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Cadence</Label>
                            <select
                              value={bulkSubCadence}
                              onChange={(e) => setBulkSubCadence(e.target.value as any)}
                              className="w-full h-8 text-[11px] bg-background rounded border border-input px-2 font-medium cursor-pointer"
                            >
                              <option value="once">Once</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>

                          {/* Duration Hours */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Duration (Hours)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={bulkSubDurationHours}
                              onChange={(e) => setBulkSubDurationHours(e.target.value)}
                              className="h-8 text-[11px] font-mono"
                            />
                          </div>

                          {/* Deadline Date */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Deadline Date</Label>
                            <Input
                              type="date"
                              value={bulkSubDeadlineDate}
                              onChange={(e) => setBulkSubDeadlineDate(e.target.value)}
                              className="h-8 text-[11px]"
                            />
                          </div>

                          {/* Price */}
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Task Cost (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={bulkSubPrice}
                              onChange={(e) => setBulkSubPrice(e.target.value)}
                              className="h-8 text-[11px] font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Detected Tasks Preview List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Preview Detected Tasks ({bulkSubTasksList.length})</span>
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setBulkSubTasksList((prev) => [...prev, ""])}
                            className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Another Task
                          </Button>
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {bulkSubTasksList.map((title, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-1.5 rounded-lg border bg-background hover:border-primary/40 transition-colors shadow-2xs"
                            >
                              <span className="font-mono font-bold text-muted-foreground text-[10px] bg-muted/60 border px-1.5 py-0.5 rounded shrink-0">
                                #{idx + 1}
                              </span>
                              <Input
                                value={title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkSubTasksList((prev) =>
                                    prev.map((t, i) => (i === idx ? val : t))
                                  );
                                }}
                                placeholder="Task title..."
                                className="h-7 text-xs font-medium flex-1 bg-transparent"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setBulkSubTasksList((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                                title="Remove this task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setBulkSubStep("paste")}
                          disabled={bulkSubSaving}
                          className="h-8 text-xs gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to Text Input</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateAllBulkSubtasks}
                          disabled={bulkSubSaving || bulkSubTasksList.filter((t) => t.trim().length > 0).length === 0}
                          className="h-8 px-4 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                        >
                          {bulkSubSaving ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                              <span>Creating Tasks...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Create All {bulkSubTasksList.filter((t) => t.trim().length > 0).length} Tasks</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            '''
    text = text[:idx_start] + new_box_jsx + text[idx_end:]
    print("5. Replaced Subtask Input Box with Single / Bulk Toggle")
else:
    print("5. Box markers not found:", idx_start, idx_end)

with open('app/admin/operations/tasks/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Saved page.tsx")
