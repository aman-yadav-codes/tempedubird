with open("app/admin/my-profile/my-profile-client.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update imports
old_import = """import { TaskHistoryDialog } from "../operations/tasks/task-history-dialog";"""
new_import = """import { TaskHistoryDialog } from "../operations/tasks/task-history-dialog";
import { SubTaskUploadDialog } from "../operations/tasks/subtask-upload-dialog";
import { SubTaskWorkUpdateDialog } from "../operations/tasks/subtask-work-update-dialog";"""

code = code.replace(old_import, new_import, 1)

old_icon_import = """  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";"""

new_icon_import = """  ChevronDown,
  Image as ImageIcon,
  Upload,
  MessageSquare,
} from "lucide-react";"""

code = code.replace(old_icon_import, new_icon_import, 1)

# 2. Add modal state variables
old_state_anchor = """  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<number, boolean>>({});"""
new_state_anchor = """  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<number, boolean>>({});
  const [uploadModalState, setUploadModalState] = useState<{ task: any; subtask: any } | null>(null);
  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: any; subtask: any } | null>(null);

  const handleRefreshMyProfileTasks = async () => {
    try {
      const instQuery = activeInstitutionId ? `&institution_id=${activeInstitutionId}` : "";
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const tRes = await fetch(`/api/admin/operations/tasks?scope=me&employee_id=me${instQuery}`, { headers });
      const tData = await tRes.json();
      if (tData?.tasks) setTasks(tData.tasks);
    } catch (err) {
      console.error("Failed to refresh tasks:", err);
    }
  };"""

code = code.replace(old_state_anchor, new_state_anchor, 1)

# 3. Update the subtask card layout to match the highlighted design
old_subtask_card = """                              return (
                                <div
                                  key={sub.id || sIdx}
                                  className="p-3 rounded-xl bg-background border text-xs space-y-2 hover:border-primary/40 transition-colors shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      <span className="font-bold text-muted-foreground text-[10px]">#{sIdx + 1}</span>
                                      <span className={`font-bold text-xs truncate ${isSubDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {sub.title}
                                      </span>

                                      {/* Subtask Attached Images */}
                                      {(() => {
                                        const subImages: Array<{ url: string; name?: string }> = [];
                                        if (Array.isArray(sub.images)) {
                                          sub.images.forEach((img: any) => img?.url && subImages.push({ url: img.url, name: img.name }));
                                        }
                                        if (Array.isArray(sub.uploads)) {
                                          sub.uploads.forEach((u: any) => {
                                            const url = u.file_url || u.url;
                                            const isImg = u.file_type === "png" || u.file_type === "jpg" || u.file_type === "jpeg" || u.file_type === "webp" || u.file_type === "gif" || String(url || "").match(/\\.(png|jpg|jpeg|webp|gif|svg)/i);
                                            if (url && isImg && !subImages.some((si) => si.url === url)) {
                                              subImages.push({ url, name: u.file_name || u.name || "Attachment" });
                                            }
                                          });
                                        }
                                        if (sub.image_url && !subImages.some((si) => si.url === sub.image_url)) {
                                          subImages.push({ url: sub.image_url, name: sub.image_name || "Pasted Image" });
                                        }

                                        if (subImages.length === 0) return null;

                                        return (
                                          <div className="flex items-center gap-1 shrink-0 flex-wrap">
                                            {subImages.map((img, iIdx) => (
                                              <a
                                                key={iIdx}
                                                href={img.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative inline-block shrink-0"
                                                title={`View attached image ${iIdx + 1} in full size`}
                                              >
                                                <img
                                                  src={img.url}
                                                  alt={img.name || `Task visual ${iIdx + 1}`}
                                                  className="w-7 h-7 rounded border object-cover group-hover:scale-110 transition-transform shadow-2xs cursor-pointer hover:ring-2 hover:ring-primary/50"
                                                />
                                              </a>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                      {sub.price && (
                                        <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px] tracking-wider">
                                          ₹{Number(sub.price).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                      <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9px] gap-1 font-semibold">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-500" /> +{sub.points || 20} / -{sub.penalty_points || 10} pts
                                      </Badge>
                                      {sub.is_daily_recurring ? (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] gap-1 font-semibold">
                                          <RefreshCw className="w-2.5 h-2.5" /> Daily Basis
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[9px] gap-1 font-semibold">
                                          <Zap className="w-2.5 h-2.5" /> Once
                                        </Badge>
                                      )}
                                    </div>

                                    {/* "Started by" banner — only shown when subtask is actively in progress */}
                                    {subNormStatus === "in_progress" && (
                                      <div className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-800 dark:text-blue-300 font-semibold my-1">
                                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                                        <span>
                                          Active — Started by{" "}
                                          <span className="font-bold">
                                            {sub.started_by_name ||
                                              sub.assigned_employee_name ||
                                              "You"}
                                          </span>
                                          {sub.started_at && (
                                            <span className="ml-1 font-normal text-blue-700 dark:text-blue-400">
                                              at {new Date(sub.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {/* Subtask Quick Action Buttons */}
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      {isSubPending && (
                                        <Button
                                          size="sm"
                                          onClick={() => requestStartTaskWithLocation(task, sub.id, sub.title)}
                                          className="h-6 text-[10px] px-2.5 font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
                                        >
                                          <Play className="w-2.5 h-2.5 fill-current" /> Start
                                        </Button>
                                      )}

                                      {subNormStatus === "in_progress" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleSubtaskStatusUpdate(task, sub.id, "pending")}
                                          className="h-6 text-[10px] px-2.5 font-bold gap-1 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                        >
                                          <Square className="w-2.5 h-2.5 fill-current" /> Stop
                                        </Button>
                                      )}

                                      <select
                                        value={subNormStatus}
                                        onChange={(e) => handleSubtaskStatusUpdate(task, sub.id, e.target.value)}
                                        className="h-6 text-[10px] font-semibold w-24 bg-muted/20 rounded border border-input px-1 outline-none cursor-pointer text-foreground"
                                      >
                                        <option value="pending">Pending</option>
                                        {subNormStatus === "in_progress" && <option value="in_progress" disabled>In Progress</option>}
                                        <option value="under_review">Under Review</option>
                                        {subNormStatus === "completed" && <option value="completed" disabled>Completed</option>}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Subtask Details / Meta */}
                                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t text-[11px] text-muted-foreground">"""

new_subtask_card = """                              return (
                                <div
                                  key={sub.id || sIdx}
                                  className="p-3.5 rounded-2xl bg-background border border-emerald-500/20 text-xs space-y-2.5 hover:border-emerald-500/40 transition-all shadow-2xs"
                                >
                                  {/* Line 1: Title, Attached Images & Assigned to You */}
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      <span className="font-bold text-muted-foreground text-[10px] bg-muted/60 border px-1.5 py-0.5 rounded shrink-0">
                                        #{sIdx + 1}
                                      </span>
                                      <span className={`font-bold text-xs ${isSubDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {sub.title}
                                      </span>

                                      {/* Subtask Attached Images */}
                                      {(() => {
                                        const subImages: Array<{ url: string; name?: string }> = [];
                                        if (Array.isArray(sub.images)) {
                                          sub.images.forEach((img: any) => img?.url && subImages.push({ url: img.url, name: img.name }));
                                        }
                                        if (Array.isArray(sub.uploads)) {
                                          sub.uploads.forEach((u: any) => {
                                            const url = u.file_url || u.url;
                                            const isImg = u.file_type === "png" || u.file_type === "jpg" || u.file_type === "jpeg" || u.file_type === "webp" || u.file_type === "gif" || String(url || "").match(/\\.(png|jpg|jpeg|webp|gif|svg)/i);
                                            if (url && isImg && !subImages.some((si) => si.url === url)) {
                                              subImages.push({ url, name: u.file_name || u.name || "Attachment" });
                                            }
                                          });
                                        }
                                        if (sub.image_url && !subImages.some((si) => si.url === sub.image_url)) {
                                          subImages.push({ url: sub.image_url, name: sub.image_name || "Pasted Image" });
                                        }

                                        if (subImages.length === 0) return null;

                                        return (
                                          <div className="flex items-center gap-1 shrink-0 flex-wrap">
                                            {subImages.map((img, iIdx) => (
                                              <a
                                                key={iIdx}
                                                href={img.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative inline-block shrink-0"
                                                title={`View attached image ${iIdx + 1} in full size`}
                                              >
                                                <img
                                                  src={img.url}
                                                  alt={img.name || `Task visual ${iIdx + 1}`}
                                                  className="w-7 h-7 rounded border object-cover group-hover:scale-110 transition-transform shadow-2xs cursor-pointer hover:ring-2 hover:ring-primary/50"
                                                />
                                              </a>
                                            ))}
                                          </div>
                                        );
                                      })()}

                                      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 text-[9px] px-1.5 py-0 gap-1 font-bold shrink-0">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Assigned to You
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Line 2: Cost, Cadence, Urgency (Highlighted), Bonus/Penalty */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-[11px] tracking-wider border border-rose-500/20">
                                      ₹{Number(sub.price || 0).toLocaleString("en-IN")}
                                    </span>

                                    {sub.is_daily_recurring ? (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] gap-1 font-semibold">
                                        <RefreshCw className="w-2.5 h-2.5" /> Daily
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 text-[9px] gap-1 font-semibold">
                                        <Zap className="w-2.5 h-2.5" /> {sub.cadence ? sub.cadence.charAt(0).toUpperCase() + sub.cadence.slice(1) : "Once"}
                                      </Badge>
                                    )}

                                    {/* Urgency Badge (Highlighted in User's Request) */}
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] gap-1 font-semibold ${
                                        sub.urgency === "urgent"
                                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                          : sub.urgency === "high"
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                          : sub.urgency === "low"
                                          ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30"
                                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                      }`}
                                    >
                                      <Clock className="w-2.5 h-2.5" />
                                      <span className="capitalize">{sub.urgency || "Medium"}</span>
                                    </Badge>

                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9px] gap-1 font-semibold">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-500" /> +Bonus {sub.points || 20} / Penalty -{sub.penalty_points || 10} pts
                                    </Badge>
                                  </div>

                                  {/* Line 3: Assignee, Hours, Deadline, Duration Taken */}
                                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                      <User className="w-3 h-3 text-rose-500" />
                                      <span>{sub.assigned_employee_name || "Platform Admin"}</span>
                                    </span>

                                    <span className="inline-flex items-center gap-1 font-medium">
                                      <Clock className="w-3 h-3 text-primary" />
                                      <span>{sub.duration_hours || 1}h</span>
                                    </span>

                                    {sub.deadline_date && (
                                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                                        <Calendar className="w-3 h-3 text-amber-600" />
                                        <span>{sub.deadline_date} {sub.deadline_time || "18:00"}</span>
                                      </span>
                                    )}

                                    {(() => {
                                      const takenSecs = getSubtaskDurationTakenSeconds(sub, task, nowTime);
                                      return (
                                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground ml-auto">
                                          <Clock className="w-2.5 h-2.5 text-primary" />
                                          <span>{formatDurationTaken(takenSecs)} taken</span>
                                        </span>
                                      );
                                    })()}
                                  </div>

                                  {/* "Started by" banner — only shown when subtask is actively in progress */}
                                  {subNormStatus === "in_progress" && (
                                    <div className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-800 dark:text-blue-300 font-semibold my-1">
                                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                                      <span>
                                        Active — Started by{" "}
                                        <span className="font-bold">
                                          {sub.started_by_name ||
                                            sub.assigned_employee_name ||
                                            "You"}
                                        </span>
                                        {sub.started_at && (
                                          <span className="ml-1 font-normal text-blue-700 dark:text-blue-400">
                                            at {new Date(sub.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {/* Line 4: Status Selector, Start/Stop Button, Upload task Button, Update work Button */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/60">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-muted-foreground font-medium">Status:</span>
                                        <select
                                          value={subNormStatus}
                                          onChange={(e) => handleSubtaskStatusUpdate(task, sub.id, e.target.value)}
                                          className="h-7 text-[10px] font-semibold w-28 bg-muted/20 rounded-md border border-input px-1.5 outline-none cursor-pointer text-foreground"
                                        >
                                          <option value="pending">Pending</option>
                                          {subNormStatus === "in_progress" && <option value="in_progress" disabled>In Progress</option>}
                                          <option value="under_review">Under Review</option>
                                          {subNormStatus === "completed" && <option value="completed" disabled>Completed</option>}
                                        </select>
                                      </div>

                                      {isSubPending && (
                                        <Button
                                          size="sm"
                                          onClick={() => requestStartTaskWithLocation(task, sub.id, sub.title)}
                                          className="h-7 text-[10px] px-2.5 font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer rounded-md"
                                        >
                                          <Play className="w-2.5 h-2.5 fill-current" /> Start
                                        </Button>
                                      )}

                                      {subNormStatus === "in_progress" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleSubtaskStatusUpdate(task, sub.id, "pending")}
                                          className="h-7 text-[10px] px-2.5 font-bold gap-1 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shadow-2xs rounded-md"
                                        >
                                          <Square className="w-2.5 h-2.5 fill-current" /> Stop
                                        </Button>
                                      )}
                                    </div>

                                    {/* Action Buttons: Upload task & Update work */}
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      {/* Upload Task Button (Highlighted in User's Request) */}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setUploadModalState({ task, subtask: sub })}
                                        className="h-7 px-2.5 text-[11px] font-bold gap-1 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer bg-background shadow-2xs rounded-md"
                                        title="Upload Deliverable Files (PDF, Word, Images, Video, Excel)"
                                      >
                                        <Upload className="w-3 h-3 text-rose-600" /> Upload task
                                        {Array.isArray((sub as any).uploads) && (sub as any).uploads.length > 0 && (
                                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold ml-0.5">
                                            {(sub as any).uploads.length}
                                          </Badge>
                                        )}
                                      </Button>

                                      {/* Update Work Button (Highlighted in User's Request) */}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setWorkUpdateModalState({ task, subtask: sub })}
                                        className="h-7 px-2.5 text-[11px] font-bold gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer bg-background shadow-2xs rounded-md"
                                        title="Post Daily / Progress Work Update"
                                      >
                                        <MessageSquare className="w-3 h-3 text-emerald-600" /> Update work
                                        {Array.isArray((sub as any).work_updates) && (sub as any).work_updates.length > 0 && (
                                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold ml-0.5">
                                            {(sub as any).work_updates.length}
                                          </Badge>
                                        )}
                                      </Button>
                                    </div>
                                  </div>"""

code = code.replace(old_subtask_card, new_subtask_card, 1)

# Remove the redundant old action buttons block from the details row
old_remaining_details = """                                  {/* Subtask Details / Meta */}
                                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t text-[11px] text-muted-foreground">"""

new_remaining_details = """                                  {/* Subtask Extended Tooltips & Schedule info */}
                                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[10px] text-muted-foreground">"""

code = code.replace(old_remaining_details, new_remaining_details, 1)

# 4. Mount the dialogs at the bottom alongside TaskHistoryDialog
old_history_dialog = """          {/* Task History Audit Trail Dialog */}
          <TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => !open && setHistoryModalTask(null)}
            task={historyModalTask}
          />"""

new_history_dialog = """          {/* Task History Audit Trail Dialog */}
          <TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => !open && setHistoryModalTask(null)}
            task={historyModalTask}
          />

          {/* Sub-Task Upload Dialog (Images, Videos, PDF, Word, Excel) */}
          <SubTaskUploadDialog
            open={Boolean(uploadModalState)}
            onOpenChange={(open) => !open && setUploadModalState(null)}
            task={uploadModalState?.task || null}
            subtask={uploadModalState?.subtask || null}
            onSaved={handleRefreshMyProfileTasks}
          />

          {/* Sub-Task Work Update Dialog (Post work updates with files & notes) */}
          <SubTaskWorkUpdateDialog
            open={Boolean(workUpdateModalState)}
            onOpenChange={(open) => !open && setWorkUpdateModalState(null)}
            task={workUpdateModalState?.task || null}
            subtask={workUpdateModalState?.subtask || null}
            onSaved={handleRefreshMyProfileTasks}
          />"""

code = code.replace(old_history_dialog, new_history_dialog, 1)

with open("app/admin/my-profile/my-profile-client.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Saved my-profile-client.tsx successfully with all highlighted features")

