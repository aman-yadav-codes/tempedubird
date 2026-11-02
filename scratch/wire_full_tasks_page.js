const fs = require('fs');

const path = 'app/admin/operations/tasks/page.tsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. handleOpenCreateTask
const createFind = `    setFormPenaltyPoints("10");\n    setTaskDialogOpen(true);`;
const createReplace = `    setFormPenaltyPoints("10");
    setFormProjectFor("own_company");
    setFormCompanyName("EduBird");
    setFormStartDate("");
    setFormDueDate("");
    setFormCurrency("INR");
    setFormCost("0");
    setFormLiveUrl("");
    setFormDemoUrl("");
    setFormProjectLeaderId("none");
    setFormProjectLeaderName("");
    setFormAgreementDocUrl("");
    setFormAgreementDocName("");
    setTaskDialogOpen(true);`;

if (content.includes(createFind)) {
  content = content.replace(createFind, createReplace);
  console.log('1. Updated handleOpenCreateTask');
} else {
  console.log('1. createFind not found');
}

// 2. handleOpenEditTask
const editFind = `    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");\n    setTaskDialogOpen(true);`;
const editReplace = `    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
    setFormProjectFor(t.project_for === "client" ? "client" : "own_company");
    setFormCompanyName(t.company_name || "EduBird");
    setFormStartDate(t.start_date ? new Date(t.start_date).toISOString().split("T")[0] : "");
    setFormDueDate(t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : "");
    setFormCurrency(t.currency || "INR");
    const costVal = t.cost !== undefined && t.cost !== null ? String(t.cost) : (t.price !== undefined && t.price !== null ? String(t.price) : "0");
    setFormCost(costVal);
    setFormLiveUrl(t.live_url || "");
    setFormDemoUrl(t.demo_url || "");
    setFormProjectLeaderId(t.project_leader_id ? String(t.project_leader_id) : "none");
    setFormProjectLeaderName(t.project_leader_name || "");
    setFormAgreementDocUrl(t.agreement_document_url || (t as any).agreement_file_url || "");
    setFormAgreementDocName(t.agreement_document_name || (t as any).agreement_file_name || "");
    setTaskDialogOpen(true);`;

if (content.includes(editFind)) {
  content = content.replace(editFind, editReplace);
  console.log('2. Updated handleOpenEditTask');
} else {
  console.log('2. editFind not found');
}

// 3. handleSaveMainTask
const saveFind = `          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
        }),`;

const saveReplace = `          penalty_points: parseFloat(formPenaltyPoints) || 10,
          project_for: formProjectFor,
          company_name: formProjectFor === "own_company" ? "EduBird" : (formClientName.trim() || null),
          start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
          deadline: formDueDate ? new Date(formDueDate).toISOString() : null,
          due_date: formDueDate ? new Date(formDueDate).toISOString() : null,
          currency: formCurrency,
          cost: parseFloat(formCost) || 0,
          price: parseFloat(formCost) || 0,
          live_url: formLiveUrl.trim() || null,
          demo_url: formDemoUrl.trim() || null,
          project_leader_id: formProjectLeaderId !== "none" ? parseInt(formProjectLeaderId) : null,
          project_leader_name: formProjectLeaderName.trim() || null,
          agreement_document_url: formAgreementDocUrl.trim() || null,
          agreement_document_name: formAgreementDocName.trim() || null,
          sub_tasks: editingTask?.sub_tasks || [],
        }),`;

if (content.includes(saveFind)) {
  content = content.replace(saveFind, saveReplace);
  console.log('3. Updated handleSaveMainTask');
} else {
  console.log('3. saveFind not found');
}

// 4. Card Header Replacement
const cardHeaderTargetRegex = /<CardContent className="p-5 space-y-4 text-xs">[\s\S]*?{\/\* FULL WIDTH TASK NAMING \/ TITLE \*\/}\s*<div className="w-full pt-1">\s*<h3 className="text-base font-bold text-foreground leading-snug break-words w-full">\s*\{task\.title\}\s*<\/h3>\s*<\/div>/;

const cardHeaderReplacement = `<CardContent className="p-5 space-y-4 text-xs">
                  {/* Top Header Row: #ID + Project Title on left, Status & 3-dots Menu on right */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                      <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 border px-2 py-0.5 rounded-md shrink-0">
                        #{task.id}
                      </span>
                      <h3 className="text-base font-bold text-foreground leading-tight truncate">
                        {task.title}
                      </h3>
                      {getUrgencyBadge(task.urgency)}
                      {task.is_daily_recurring && (
                        <Badge variant="outline" className={task.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold" : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] gap-1 font-semibold"}>
                          <RefreshCw className="w-3 h-3" /> {task.status === "completed" ? "Daily (Done)" : "Daily"}
                        </Badge>
                      )}
                      {isAssigned && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Assigned to You
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isInstitutionAdmin && (
                        <select
                          value={task.status}
                          onChange={(e) => handleQuickTaskStatusChange(task.id, e.target.value)}
                          className="h-8 text-xs font-bold w-32 bg-muted/30 rounded-lg border border-input px-2 outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer text-foreground"
                        >
                          {allowedStatuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}

                      <ProjectActionDropdown
                        task={task}
                        onEdit={() => handleOpenEditTask(task)}
                        onInvoices={() => setInvoiceModalTask(task)}
                        onBreakdown={() => setBreakdownModalTask(task)}
                        onHistory={() => {
                          setHistoryModalTask(task);
                          setSubtaskHistoryFilter({});
                        }}
                        onAdjustScore={() => handleOpenAdjustScore(task)}
                        onSubtasks={() => handleOpenSubtasksModal(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        isStaffRole={isStaffRole}
                        canEditOrRemove={canEditOrRemove}
                        currencySymbol={getCurrencySymbol(task.currency)}
                      />
                    </div>
                  </div>`;

if (cardHeaderTargetRegex.test(content)) {
  content = content.replace(cardHeaderTargetRegex, cardHeaderReplacement);
  console.log('4. Updated Card Header layout');
} else {
  console.log('4. cardHeaderTargetRegex not matched');
}

// 5. Add + Sub-Tasks button to Sub-Tasks & Assignees header
const subHeaderOld = `<div
                      className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors text-xs font-bold text-foreground"
                      onClick={() =>
                        setExpandedTaskSubtasks((prev) => ({
                          ...prev,
                          [task.id]: !isExpanded,
                        }))
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>Sub-Tasks & Assignees ({subTasksList.length})</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {isExpanded ? "Collapse" : "Expand"}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>`;

const subHeaderNew = `<div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <div
                        className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors"
                        onClick={() =>
                          setExpandedTaskSubtasks((prev) => ({
                            ...prev,
                            [task.id]: !isExpanded,
                          }))
                        }
                      >
                        <Layers className="w-4 h-4 text-primary" />
                        <span>Sub-Tasks & Assignees ({subTasksList.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSubtasksModal(task)}
                          className="h-6 px-2 text-[11px] font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> + Sub-Tasks
                        </Button>
                        <span
                          className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground"
                          onClick={() =>
                            setExpandedTaskSubtasks((prev) => ({
                              ...prev,
                              [task.id]: !isExpanded,
                            }))
                          }
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>`;

if (content.includes(subHeaderOld)) {
  content = content.replace(subHeaderOld, subHeaderNew);
  console.log('5. Added + Sub-Tasks to Sub-Tasks & Assignees header');
} else {
  console.log('5. subHeaderOld not found');
}

// 6. Sub-task Card: Add History button in subtask header
const subCardHeaderOld = `                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleOpenEditSubtask(task, sub)}
                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md cursor-pointer"
                                        title="Edit Deliverable / Sub-Task"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>`;

const subCardHeaderNew = `                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setHistoryModalTask(task);
                                          setSubtaskHistoryFilter({ subtaskId: sub.id, subtaskTitle: sub.title });
                                        }}
                                        className="h-6 px-2 text-[10px] font-semibold gap-1 text-muted-foreground hover:text-foreground border-border/80 bg-background cursor-pointer"
                                        title="View History for this Deliverable"
                                      >
                                        <History className="w-3 h-3 text-primary" /> History
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleOpenEditSubtask(task, sub)}
                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md cursor-pointer"
                                        title="Edit Deliverable / Sub-Task"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </Button>`;

if (content.includes(subCardHeaderOld)) {
  content = content.replace(subCardHeaderOld, subCardHeaderNew);
  console.log('6. Added History button in subtask card header');
} else {
  console.log('6. subCardHeaderOld not found');
}

// 7. Sub-task Card: Add Upload task and Update work buttons next to Status select
const subStatusOld = `                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">Status:</span>
                                <select
                                  value={sub.status || "pending"}
                                  onChange={(e) => handleSubTaskStatusDirectUpdate(task, sub.id, e.target.value)}
                                  className="h-6 text-[10px] font-semibold w-28 bg-muted/20 rounded border border-input px-1.5 outline-none cursor-pointer text-foreground"
                                >
                                  {allowedStatuses.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>`;

const subStatusNew = `                              <div className="flex items-center gap-2 flex-wrap ml-auto">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground">Status:</span>
                                  <select
                                    value={sub.status || "pending"}
                                    onChange={(e) => handleSubTaskStatusDirectUpdate(task, sub.id, e.target.value)}
                                    className="h-7 text-[10px] font-semibold w-28 bg-muted/20 rounded border border-input px-1.5 outline-none cursor-pointer text-foreground"
                                  >
                                    {allowedStatuses.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setUploadModalState({ task, subtask: sub })}
                                  className="h-7 px-2.5 text-[11px] font-bold gap-1 text-primary border-primary/40 hover:bg-primary/5 cursor-pointer bg-background shadow-2xs"
                                  title="Upload Deliverable Files (PDF, Word, Images)"
                                >
                                  <Upload className="w-3 h-3" /> Upload task
                                  {Array.isArray((sub as any).uploads) && (sub as any).uploads.length > 0 && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary font-bold ml-0.5">
                                      {(sub as any).uploads.length}
                                    </Badge>
                                  )}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setWorkUpdateModalState({ task, subtask: sub })}
                                  className="h-7 px-2.5 text-[11px] font-bold gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer bg-background shadow-2xs"
                                  title="Post Daily / Progress Work Update"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-600" /> Update work
                                  {Array.isArray((sub as any).work_updates) && (sub as any).work_updates.length > 0 && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold ml-0.5">
                                      {(sub as any).work_updates.length}
                                    </Badge>
                                  )}
                                </Button>
                              </div>`;

if (content.includes(subStatusOld)) {
  content = content.replace(subStatusOld, subStatusNew);
  console.log('7. Added Upload task and Update work buttons to subtask card');
} else {
  console.log('7. subStatusOld not found');
}

// 8. Mount all modal dialogs at the bottom
const bottomOld = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => !open && setHistoryModalTask(null)}
        task={historyModalTask}
      />`;

const bottomNew = `      {/* Project Invoices Dialog */}
      <ProjectInvoicesDialog
        open={Boolean(invoiceModalTask)}
        onOpenChange={(open) => !open && setInvoiceModalTask(null)}
        task={invoiceModalTask}
        onSaved={fetchTasks}
      />

      {/* Project Breakdown & Extra Tasks Dialog */}
      <ProjectBreakdownDialog
        open={Boolean(breakdownModalTask)}
        onOpenChange={(open) => !open && setBreakdownModalTask(null)}
        task={breakdownModalTask}
        onSaved={fetchTasks}
      />

      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        open={Boolean(historyModalTask)}
        filterSubtaskId={subtaskHistoryFilter.subtaskId}
        filterSubtaskTitle={subtaskHistoryFilter.subtaskTitle}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryModalTask(null);
            setSubtaskHistoryFilter({});
          }
        }}
        task={historyModalTask}
      />

      {/* Sub-Task Upload Dialog (PDF, Word, Images with uploader access control) */}
      <SubTaskUploadDialog
        open={Boolean(uploadModalState)}
        onOpenChange={(open) => !open && setUploadModalState(null)}
        task={uploadModalState?.task || null}
        subtask={uploadModalState?.subtask || null}
        onSaved={fetchTasks}
      />

      {/* Sub-Task Work Update Dialog (Post work updates with attachments & timestamps) */}
      <SubTaskWorkUpdateDialog
        open={Boolean(workUpdateModalState)}
        onOpenChange={(open) => !open && setWorkUpdateModalState(null)}
        task={workUpdateModalState?.task || null}
        subtask={workUpdateModalState?.subtask || null}
        onSaved={fetchTasks}
      />`;

if (content.includes(bottomOld)) {
  content = content.replace(bottomOld, bottomNew);
  console.log('8. Mounted all modal dialogs at bottom');
} else {
  console.log('8. bottomOld not found');
}

fs.writeFileSync(path, content, 'utf8');
console.log('All steps completed successfully!');
