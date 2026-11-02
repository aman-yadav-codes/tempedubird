const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

const marker = '{subTasksList.map((sub, index) => {';
const sIdx = code.indexOf(marker);
if (sIdx !== -1) {
  // Find start of {isExpanded before marker
  const isExpIdx = code.lastIndexOf('{isExpanded && subTasksList.length > 0 && (', sIdx);
  // Find the end of this subTasksList block
  const endIdx = code.indexOf('</CardContent>', sIdx);
  const closingIdx = code.lastIndexOf('</div>\n                    )}', endIdx);
  
  if (isExpIdx !== -1 && closingIdx !== -1) {
    const afterClosing = closingIdx + '</div>\n                    )}'.length;
    const replacement = `{isExpanded && subTasksList.length > 0 && (
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
                            allowedStatuses={allowedStatuses}
                            onUpdateSubtask={handleDirectSubtaskFieldUpdate}
                            onDeleteSubtask={handleDirectSubtaskDelete}
                            onOpenEdit={(t, s) => handleOpenEditSubtask(t, s)}
                            onOpenHistory={() => setHistoryModalTask(task)}
                            onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s })}
                            onStatusChange={(t, subId, status) => handleSubTaskStatusDirectUpdate(t, subId, status)}
                            onStart={(t, s) => handleSubTaskStatusDirectUpdate(t, s.id, "in_progress")}
                            onStop={(t, s) => handleSubTaskStatusDirectUpdate(t, s.id, "pending")}
                          />
                        ))}
                      </div>
                    )}`;
    code = code.substring(0, isExpIdx) + replacement + code.substring(afterClosing);
    fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
    console.log('Successfully replaced second subtask loop with SubtaskCard!');
  } else {
    console.log('Could not find bounds:', isExpIdx, closingIdx);
  }
} else {
  console.log('Marker not found');
}

