const fs = require('fs');
let code = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Replace subtask section
const startMarker = '{/* Sub-Tasks List (if any) */}';
const sIdx = code.indexOf(startMarker);
const endMarker = '</Card>';
const eIdx = code.indexOf(endMarker, sIdx);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = `{/* Sub-Tasks Deliverables & Header with + add sub task */}
                    <div className="px-5 py-3 border-t bg-card">
                      <div className="flex items-center justify-between text-xs font-bold text-foreground pb-2 flex-wrap gap-2">
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
                              handleOpenAddSubtask(task);
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
                      </div>

                      {isExpanded && subTasksList.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {subTasksList.map((sub: any, sIdx: number) => (
                            <SubtaskCard
                              key={sub.id || sIdx}
                              task={task}
                              subtask={sub}
                              index={sIdx}
                              currentUserId={user?.id}
                              isClientView={isClientRole || Boolean(pathname?.startsWith("/client"))}
                              staffOptions={getProjectStaffOptions(task)}
                              onUpdateSubtask={handleDirectSubtaskFieldUpdate}
                              onDeleteSubtask={handleDirectSubtaskDelete}
                              onOpenEdit={(t, s) => {
                                setEditingSubtaskTargetTask(t);
                                setEditingSubtask(s);
                                setEditSubtaskDialogOpen(true);
                              }}
                              onOpenHistory={() => setHistoryModalTask(task)}
                              onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s })}
                              onStatusChange={(t, subId, status) => handleSubtaskStatusUpdate(t, subId, status)}
                              onStart={(t, s) => handleSubtaskStatusUpdate(t, s.id, "in_progress")}
                              onStop={(t, s) => handleSubtaskStatusUpdate(t, s.id, "pending")}
                            />
                          ))}
                        </div>
                      )}

                      {isExpanded && subTasksList.length === 0 && (
                        <div className="py-6 text-center border border-dashed rounded-xl my-2 text-xs text-muted-foreground">
                          No sub-tasks yet. Click &quot;add sub task&quot; to assign deliverables.
                        </div>
                      )}
                    </div>\n\n                    `;
  code = code.substring(0, sIdx) + replacement + code.substring(eIdx);
  console.log("Replaced Subtask section in my-profile-client.tsx with SubtaskCard!");
}

// 2. Mount dialogs
const historyAnchor = `          {/* Task History Audit Trail Dialog */}
          <TaskHistoryDialog
            open={Boolean(historyModalTask)}
            onOpenChange={(open) => !open && setHistoryModalTask(null)}
            task={historyModalTask}
          />`;

const newDialogsBlock = `          {/* Task History Audit Trail Dialog */}
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

          {/* Edit / Add Sub-Task Dialog with single cadence dropdown */}
          <EditSubtaskDialog
            open={editSubtaskDialogOpen}
            onOpenChange={setEditSubtaskDialogOpen}
            task={editingSubtaskTargetTask}
            subtask={editingSubtask}
            staffOptions={editingSubtaskTargetTask ? getProjectStaffOptions(editingSubtaskTargetTask) : []}
            onSaved={handleRefreshMyProfileTasks}
            accessToken={accessToken}
          />`;

if (code.includes(historyAnchor) && !code.includes('EditSubtaskDialog')) {
  code = code.replace(historyAnchor, newDialogsBlock);
  console.log("Mounted SubTaskUploadDialog and EditSubtaskDialog in my-profile-client.tsx!");
}

fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', code, 'utf8');
console.log("Successfully updated app/admin/my-profile/my-profile-client.tsx");

