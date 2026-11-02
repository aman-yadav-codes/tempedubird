const fs = require('fs');

const path = 'app/admin/operations/tasks/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. In handleOpenCreateTask, reset project specific form states
const createTarget = `    setFormPenaltyPoints("10");\n    setTaskDialogOpen(true);`;
const createReplacement = `    setFormPenaltyPoints("10");
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

if (!content.includes(createReplacement)) {
  if (content.includes(createTarget)) {
    content = content.replace(createTarget, createReplacement);
    console.log('1. Updated handleOpenCreateTask');
  } else {
    console.log('1. Could not find createTarget');
  }
} else {
  console.log('1. Already updated handleOpenCreateTask');
}

// 2. In handleOpenEditTask, populate project specific form states
const editTarget = `    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");\n    setTaskDialogOpen(true);`;
const editReplacement = `    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
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

if (!content.includes(editReplacement)) {
  if (content.includes(editTarget)) {
    content = content.replace(editTarget, editReplacement);
    console.log('2. Updated handleOpenEditTask');
  } else {
    console.log('2. Could not find editTarget');
  }
} else {
  console.log('2. Already updated handleOpenEditTask');
}

// 3. In handleSaveMainTask, send all project fields in JSON body
const saveTarget = `        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          institution_id: isPlatformRoute ? null : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : null),
          client_id: isInstitutionAdmin ? null : (formClientId !== "none" ? formClientId : null),
          client_name: isInstitutionAdmin ? null : (formClientName.trim() || null),
          assigned_employees: selectedStaffObjects,
          assigned_employee_id: primaryStaffId,
          assigned_employee_name: combinedStaffNames,
          assigned_employee_role: combinedStaffRoles,
          details: formDetails.trim() || null,
          is_daily_recurring: formIsDailyRecurring,
          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
        }),`;

const saveReplacement = `        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          institution_id: isPlatformRoute ? null : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : null),
          client_id: isInstitutionAdmin ? null : (formProjectFor === "client" && formClientId !== "none" ? formClientId : null),
          client_name: isInstitutionAdmin ? null : (formProjectFor === "client" ? (formClientName.trim() || null) : null),
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
          assigned_employees: selectedStaffObjects,
          assigned_employee_id: primaryStaffId,
          assigned_employee_name: combinedStaffNames,
          assigned_employee_role: combinedStaffRoles,
          details: formDetails.trim() || null,
          is_daily_recurring: formIsDailyRecurring,
          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
        }),`;

if (!content.includes(saveReplacement)) {
  if (content.includes(saveTarget)) {
    content = content.replace(saveTarget, saveReplacement);
    console.log('3. Updated handleSaveMainTask body');
  } else {
    console.log('3. Could not find saveTarget');
  }
} else {
  console.log('3. Already updated handleSaveMainTask body');
}

// 4. Update Card Header Layout: Row 1 has #ID + Title + Badges on left, Status + ProjectActionDropdown on right.
// Remove + + Sub-Tasks from top row.
const cardHeaderOldRegex = /<CardContent className="p-5 space-y-4 text-xs">[\s\S]*?{\/\* FULL WIDTH TASK NAMING \/ TITLE \*\/}[\s\S]*?<\/div>\s*<\/div>/;

const cardHeaderNew = `<CardContent className="p-5 space-y-4 text-xs">
                  {/* Top Header Row: #ID + Project Title on left, Status & 3-dots Menu on right */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
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

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
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

if (cardHeaderOldRegex.test(content)) {
  content = content.replace(cardHeaderOldRegex, cardHeaderNew);
  console.log('4. Replaced Card Header layout');
} else {
  console.log('4. Could not match cardHeaderOldRegex');
}

// 5. Clean Summary Bar: 3 columns without the duplicate ProjectActionDropdown
const summaryOldRegex = /{\/\* Summary Bar: Total Cost, Duration, Sub-Tasks Progress & Action Dropdown \*\/}[\s\S]*?{\/\* Actions Dropdown \(where drawn in user sketch\) \*\/}[\s\S]*?<\/div>\s*<\/div>/;

const summaryNew = `{/* Summary Bar: Total Cost, Duration, Sub-Tasks Progress */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                        {formatPriceDisplay(totalCost, task.currency)}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {totalHoursDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Sub-Tasks</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {completedSubs}/{subTasksList.length} Done
                      </span>
                    </div>
                  </div>`;

if (summaryOldRegex.test(content)) {
  content = content.replace(summaryOldRegex, summaryNew);
  console.log('5. Cleaned Summary Bar');
} else {
  console.log('5. Could not match summaryOldRegex');
}

// 6. Add + Sub-Tasks button in Sub-Tasks & Assignees header
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
  console.log('6. Added + Sub-Tasks button in Sub-Tasks & Assignees header');
} else {
  console.log('6. Could not match subHeaderOld');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
