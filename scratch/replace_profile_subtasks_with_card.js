const fs = require('fs');
let code = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8');

const startMarker = '{isExpanded && (\r\n                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">\r\n                            {subTasksList.map((sub: any, sIdx: number) => {';
const altStartMarker = '{isExpanded && (\n                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">\n                            {subTasksList.map((sub: any, sIdx: number) => {';

const startIndex = code.indexOf('{subTasksList.map((sub: any, sIdx: number) => {');
if (startIndex === -1) {
  console.error('Could not find subTasksList.map');
  process.exit(1);
}

// Find preceding "{isExpanded && ("
const isExpandedIndex = code.lastIndexOf('{isExpanded && (', startIndex);
// Find ending of this block: "                            })}\r\n                          </div>\r\n                        )}"
const closingIndex = code.indexOf('</div>\n                        )}', startIndex);
const altClosingIndex = code.indexOf('</div>\r\n                        )}', startIndex);
const finalClose = closingIndex !== -1 ? closingIndex : altClosingIndex;

if (isExpandedIndex === -1 || finalClose === -1) {
  console.error('Indices not found:', { isExpandedIndex, finalClose });
  process.exit(1);
}

const endOfBlock = code.indexOf(')}', finalClose) + 2;

const replacement = `{isExpanded && (
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
                                onDeleteSubtask={(t, subId) => handleDirectSubtaskDelete(t, subId)}
                                onOpenEdit={(t, s) => handleOpenEditSubtask(t, s)}
                                onOpenHistory={() => setHistoryModalTask(task)}
                                onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s })}
                                onStatusChange={(t, subId, status) => handleSubtaskStatusUpdate(t, subId, status)}
                                onStart={(t, s) => requestStartTaskWithLocation(t, s.id, s.title)}
                                onStop={(t, s) => handleSubtaskStatusUpdate(t, s.id, "pending")}
                              />
                            ))}
                          </div>
                        )}`;

const newCode = code.slice(0, isExpandedIndex) + replacement + code.slice(endOfBlock);
fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', newCode, 'utf8');
console.log('Successfully replaced inline subtask cards with SubtaskCard');

