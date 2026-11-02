const fs = require('fs');

let code = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8');

// 1. Add X and Loader2 to lucide-react imports if missing
if (!code.includes('  Loader2,\n') && !code.includes('  Loader2,')) {
  code = code.replace(
    '  MessageSquare,\n} from "lucide-react";',
    '  MessageSquare,\n  X,\n  Loader2,\n} from "lucide-react";'
  );
}

// 2. Remove "+ Add Task" button from "Tasks Assigned to You" banner
const oldBannerBtn = `<div className="flex items-center gap-3">
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
            </div>`;

const newBannerBtn = `<div className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary">
                {tasks.filter(t => normalizeTaskStatus(t.status) === "completed").length} of {tasks.length} Completed
              </span>
            </div>`;

if (code.includes(oldBannerBtn)) {
  code = code.replace(oldBannerBtn, newBannerBtn);
  console.log("Removed '+ Add Task' button from banner");
} else {
  // Regex fallback
  code = code.replace(
    /(<div className="flex items-center gap-3">\s*<span className="text-xs font-bold text-primary">[\s\S]*?<\/span>)\s*<Button[\s\S]*?onClick=\{\(\) => setCreateTaskDialogOpen\(true\)\}[\s\S]*?<\/Button>\s*(<\/div>)/,
    '$1\n            $2'
  );
  console.log("Regex removed '+ Add Task' button from banner");
}

// 3. Add states and handlers for Add Sub-Task
const stateAnchor = 'const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);';
const subTaskStateCode = `// Add Sub-Task Dialog State for Project Cards
  const [addSubTaskModalOpen, setAddSubTaskModalOpen] = useState(false);
  const [targetTaskForSubtask, setTargetTaskForSubtask] = useState<any | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [newSubTaskHours, setNewSubTaskHours] = useState("1");
  const [newSubTaskMinutes, setNewSubTaskMinutes] = useState("0");
  const [newSubTaskCadence, setNewSubTaskCadence] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [newSubTaskUrgency, setNewSubTaskUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newSubTaskDeadline, setNewSubTaskDeadline] = useState("");
  const [newSubTaskPoints, setNewSubTaskPoints] = useState("20");
  const [newSubTaskPenalty, setNewSubTaskPenalty] = useState("10");
  const [newSubTaskPrice, setNewSubTaskPrice] = useState("0");
  const [newSubTaskNotes, setNewSubTaskNotes] = useState("");
  const [newSubTaskImages, setNewSubTaskImages] = useState<Array<{ url: string; name: string }>>([]);
  const [newSubTaskImageUploading, setNewSubTaskImageUploading] = useState(false);
  const [savingSubTask, setSavingSubTask] = useState(false);

  const handleOpenAddSubTaskModal = (task: any) => {
    setTargetTaskForSubtask(task);
    setNewSubTaskTitle("");
    setNewSubTaskHours("1");
    setNewSubTaskMinutes("0");
    setNewSubTaskCadence(task.is_daily_recurring ? "daily" : "once");
    setNewSubTaskUrgency("medium");
    setNewSubTaskDeadline("");
    setNewSubTaskPoints("20");
    setNewSubTaskPenalty("10");
    setNewSubTaskPrice("0");
    setNewSubTaskNotes("");
    setNewSubTaskImages([]);
    setAddSubTaskModalOpen(true);
  };

  const handleSubTaskImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setNewSubTaskImageUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/uploads/image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setNewSubTaskImages((prev) => [...prev, { url: data.url, name: file.name }]);
        }
      }
      toast.success("Image attached to deliverable");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setNewSubTaskImageUploading(false);
    }
  };

  const handleSubTaskPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const dt = new DataTransfer();
          dt.items.add(file);
          handleSubTaskImageUpload(dt.files);
          break;
        }
      }
    }
  };

  const handleSaveNewSubTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetTaskForSubtask) return;
    if (!newSubTaskTitle.trim()) {
      toast.error("Please enter a deliverable / sub-task name");
      return;
    }
    setSavingSubTask(true);
    try {
      const newSub: any = {
        id: "sub-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        title: newSubTaskTitle.trim(),
        status: "pending",
        duration_hours: parseFloat(newSubTaskHours) || 0,
        duration_minutes: parseFloat(newSubTaskMinutes) || 0,
        cadence: newSubTaskCadence,
        is_daily_recurring: newSubTaskCadence === "daily",
        urgency: newSubTaskUrgency,
        deadline: newSubTaskDeadline ? new Date(newSubTaskDeadline).toISOString() : null,
        points: parseFloat(newSubTaskPoints) || 20,
        penalty_points: parseFloat(newSubTaskPenalty) || 10,
        price: parseFloat(newSubTaskPrice) || 0,
        notes: newSubTaskNotes.trim() || null,
        assigned_employee_id: targetTaskForSubtask.assigned_employee_id || user?.id,
        assigned_employee_name: targetTaskForSubtask.assigned_employee_name || user?.full_name || (user as any)?.name,
        assigned_employee_role: targetTaskForSubtask.assigned_employee_role || null,
        images: newSubTaskImages,
        uploads: [],
        work_updates: [],
      };

      const currentSubs = Array.isArray(targetTaskForSubtask.sub_tasks) ? [...targetTaskForSubtask.sub_tasks] : [];
      const updatedSubs = [...currentSubs, newSub];

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = \`Bearer \${accessToken}\`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: targetTaskForSubtask.id,
          sub_tasks: updatedSubs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add sub-task");

      toast.success("Sub-task deliverable added successfully!");
      setAddSubTaskModalOpen(false);
      setExpandedTaskSubtasks((prev) => ({ ...prev, [targetTaskForSubtask.id]: true }));
      handleRefreshMyProfileTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to add sub-task");
    } finally {
      setSavingSubTask(false);
    }
  };

  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);`;

code = code.replace(stateAnchor, subTaskStateCode);

// 4. Update the card header next to Sub-Tasks & Deliverables
const oldSubHeader = `<div
                          className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors text-xs font-bold text-foreground pb-2"
                          onClick={() => setExpandedTaskSubtasks(prev => ({ ...prev, [task.id]: !isExpanded }))}
                        >
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-primary" />
                            <span>
                              Sub-Tasks & Deliverables ({subTasksList.length}
                              {rawSubTasksList.length !== subTasksList.length ? \` of \${rawSubTasksList.length}\` : ""})
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {isExpanded ? "Collapse" : "Expand"}
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>`;

const newSubHeader = `<div
                          className="flex items-center justify-between text-xs font-bold text-foreground pb-2 flex-wrap gap-2"
                        >
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
                                handleOpenAddSubTaskModal(task);
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
                        </div>`;

if (code.includes(oldSubHeader)) {
  code = code.replace(oldSubHeader, newSubHeader);
  console.log("Updated subtasks card header with 'add sub task' button");
} else {
  console.log("Could not find exact oldSubHeader string!");
}

// 5. Append Add Sub-Task Dialog before the closing of the component
const dialogAnchor = '{/* Sub-Task Upload Dialog (Images, Videos, PDF, Word, Excel) */}';
const subTaskDialogCode = `{/* Dedicated Add Sub-Task Dialog for Staff */}
      <Dialog open={addSubTaskModalOpen} onOpenChange={setAddSubTaskModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Layers className="h-5 w-5 text-primary" />
              <span>Add Sub-Task / Deliverable</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Project: <strong className="text-foreground">{targetTaskForSubtask?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNewSubTask} className="space-y-4 pt-1">
            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Sub-Task / Deliverable Name *
                </Label>
                <span className="text-[10px] text-muted-foreground">Tip: Paste screenshot with Ctrl+V</span>
              </div>
              <div className="relative">
                <Input
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  onPaste={handleSubTaskPaste}
                  placeholder="e.g. Design Landing Wireframe, Setup API Endpoint..."
                  className="text-xs h-9 bg-background pr-8"
                  autoFocus
                  required
                />
                <label
                  className="absolute right-2 top-2 text-muted-foreground hover:text-primary cursor-pointer p-0.5"
                  title="Attach image"
                >
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleSubTaskImageUpload(e.target.files)}
                  />
                </label>
              </div>
            </div>

            {/* Uploaded Images Preview */}
            {newSubTaskImageUploading && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium p-2 rounded-lg bg-primary/10">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading image...</span>
              </div>
            )}
            {newSubTaskImages.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/40 rounded-xl border">
                {newSubTaskImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-background">
                    <img src={img.url} alt={img.name} className="h-14 w-20 object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewSubTaskImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-90 hover:opacity-100"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Grid: Duration, Cadence, Urgency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Estimated Duration</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newSubTaskHours}
                    onChange={(e) => setNewSubTaskHours(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">h</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={newSubTaskMinutes}
                    onChange={(e) => setNewSubTaskMinutes(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">m</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cadence</Label>
                <select
                  value={newSubTaskCadence}
                  onChange={(e: any) => setNewSubTaskCadence(e.target.value)}
                  className="w-full text-xs h-9 bg-background border border-input rounded-md px-2 font-medium"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Urgency</Label>
                <select
                  value={newSubTaskUrgency}
                  onChange={(e: any) => setNewSubTaskUrgency(e.target.value)}
                  className="w-full text-xs h-9 bg-background border border-input rounded-md px-2 font-medium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Grid: Deadline, Points / Penalty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Deadline (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={newSubTaskDeadline}
                  onChange={(e) => setNewSubTaskDeadline(e.target.value)}
                  className="text-xs h-9 bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Performance Points</Label>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground h-9">
                  <span className="font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    +{newSubTaskPoints} pts
                  </span>
                  <span>/</span>
                  <span className="font-semibold text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                    -{newSubTaskPenalty} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Deliverable Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deliverable Specifications / Notes (Optional)</Label>
              <Textarea
                rows={2}
                value={newSubTaskNotes}
                onChange={(e) => setNewSubTaskNotes(e.target.value)}
                placeholder="Specific requirements, checklist items, links..."
                className="text-xs bg-background"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddSubTaskModalOpen(false)}
                disabled={savingSubTask}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingSubTask || newSubTaskImageUploading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              >
                {savingSubTask ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Adding Sub-Task...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Sub-Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-Task Upload Dialog (Images, Videos, PDF, Word, Excel) */}`;

code = code.replace(dialogAnchor, subTaskDialogCode);

fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', code, 'utf8');
console.log('Successfully patched my-profile-client.tsx!');

