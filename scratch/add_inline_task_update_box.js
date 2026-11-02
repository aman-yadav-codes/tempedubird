const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

// 1. Ensure uploadCommentFiles includes Authorization header
content = content.replace(
  'const res = await fetch("/api/admin/uploads/documents", {\n          method: "POST",\n          body: formData,\n        });',
  'const res = await fetch("/api/admin/uploads/documents", {\n          method: "POST",\n          headers: getAuthHeaders(),\n          body: formData,\n        });'
);

// 2. Replace the item card rendering to be a flex-col with top row and inline composer
const oldCardPattern = /<div\s+key=\{upl\.id\}\s+className=\{`flex items-center justify-between p-3 rounded-xl[\s\S]*?\{\/\* Edit Item Button \*\/\}[\s\S]*?<\/Button>\s*<\/div>\s*<\/div>/;

const newCardJsx = `<div
                        key={upl.id}
                        className={\`flex flex-col p-3 rounded-xl border bg-card/60 hover:bg-card shadow-2xs gap-2.5 transition-all text-xs \${
                          activeSidebar?.uploadId === upl.id ? "ring-2 ring-primary/40 border-primary/50" : ""
                        }\`}
                      >
                        {/* Top Row: File/Task Details on left, Actions Toolbar on right */}
                        <div className="flex items-center justify-between gap-3 w-full">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            {hasUrl ? (
                              <a
                                href={upl.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-foreground hover:text-primary hover:underline truncate block"
                              >
                                {upl.file_name}
                              </a>
                            ) : (
                              <span className="font-bold text-foreground truncate block">
                                {upl.file_name}
                              </span>
                            )}

                            {upl.notes && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {upl.notes}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <User className="w-2.5 h-2.5 text-primary" />
                                {upl.uploaded_by_name} {upl.uploaded_by_role ? \`(\${upl.uploaded_by_role})\` : ""}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                {dateFormatted}
                              </span>
                              {upl.file_size ? (
                                <>
                                  <span>•</span>
                                  <span>{(upl.file_size / 1024).toFixed(1)} KB</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {/* Actions Toolbar */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Status update dropdown */}
                            <select
                              value={fileStatus}
                              onChange={(e) => handleUploadStatusChange(upl.id, e.target.value)}
                              disabled={saving}
                              className={\`h-7 text-xs font-bold rounded-md border px-2 outline-none cursor-pointer shadow-2xs transition-colors \${getUploadStatusSelectClass(fileStatus)}\`}
                              title="Deliverable verification status"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="ready_for_testing">Ready for testing</option>
                              <option value="passed">Passed</option>
                              <option value="failed">Failed</option>
                              <option value="stuck">Stuck</option>
                              <option value="awaiting_confirmation">Awaiting confirmation</option>
                              {fileStatus === "completed" && <option value="completed">Completed</option>}
                            </select>

                            {/* View in browser */}
                            {hasUrl && (
                              <a
                                href={upl.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border bg-background hover:bg-muted text-primary transition-colors cursor-pointer"
                                title="Open file in browser"
                              >
                                <ExternalLink className="w-3 h-3" /> View
                              </a>
                            )}

                            {/* Download */}
                            {hasUrl && (
                              <a
                                href={upl.file_url}
                                download={upl.file_name}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Download file"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            )}

                            {/* Delete */}
                            {canDelete && (
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => handleDeleteUpload(upl.id)}
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Delete file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Comments Count */}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                setActiveSidebar((prev) =>
                                  prev?.uploadId === upl.id && prev.tab === "comments"
                                    ? null
                                    : { uploadId: upl.id, tab: "comments" }
                                )
                              }
                              className={\`h-7 px-2 w-auto text-xs font-medium border-border cursor-pointer transition-colors relative \${
                                isCommentsActive
                                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                  : commentCount > 0
                                  ? "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }\`}
                              title={\`Open Comments & History Sidebar (\${commentCount})\`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {commentCount > 0 && (
                                <span className="ml-1 text-[10px] font-bold">
                                  {commentCount}
                                </span>
                              )}
                            </Button>

                            {/* History Icon */}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                setActiveSidebar((prev) =>
                                  prev?.uploadId === upl.id && prev.tab === "history"
                                    ? null
                                    : { uploadId: upl.id, tab: "history" }
                                )
                              }
                              className={\`h-7 w-7 border-border cursor-pointer shrink-0 transition-colors \${
                                isHistoryActive
                                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }\`}
                              title="Open Audit History in Sidebar"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>

                            {/* Edit Item Button */}
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => handleOpenEditItem(upl)}
                              className="h-7 w-7 border-border cursor-pointer shrink-0 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Edit Deliverable / Task"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-primary" />
                            </Button>
                          </div>
                        </div>

                        {/* Inline Task Updates & Attachment Composer (User Request: text box where user can upload multiple images/pdf/word/excel and paste images using Ctrl+V) */}
                        <div className="pt-2 border-t space-y-2">
                          {/* Staged Attachments Preview before sending */}
                          {Array.isArray(commentAttachments[upl.id]) && commentAttachments[upl.id].length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border text-xs">
                              <span className="text-[10px] font-bold text-muted-foreground w-full">
                                Files ready to send ({commentAttachments[upl.id].length}):
                              </span>
                              {commentAttachments[upl.id].map((att) => (
                                <span
                                  key={att.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background border text-[11px] font-medium shadow-2xs"
                                >
                                  <Paperclip className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate max-w-[150px]">{att.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCommentAttachment(upl.id, att.id)}
                                    className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5 ml-0.5"
                                    title="Remove attachment"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 bg-background rounded-lg border p-1 shadow-2xs focus-within:ring-1 focus-within:ring-primary/40">
                            <Input
                              value={commentDrafts[upl.id] || ""}
                              onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [upl.id]: e.target.value }))}
                              onPaste={(e) => handlePasteComment(upl.id, e)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(upl.id);
                                }
                              }}
                              placeholder="Type update or paste screenshots (Ctrl+V)..."
                              className="text-xs h-7 border-0 bg-transparent shadow-none focus-visible:ring-0 flex-1 px-2"
                            />

                            {/* File attachment button supporting multiple images, PDF, Word, Excel */}
                            <label
                              className={\`h-7 px-2.5 rounded-md border border-dashed flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors shrink-0 \${
                                uploadingCommentAttFor === upl.id ? "opacity-60 pointer-events-none" : ""
                              }\`}
                              title="Upload multiple images, PDF, Word, Excel files"
                            >
                              <input
                                type="file"
                                multiple
                                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    uploadCommentFiles(upl.id, Array.from(e.target.files));
                                    e.target.value = "";
                                  }
                                }}
                              />
                              {uploadingCommentAttFor === upl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              ) : (
                                <Paperclip className="w-3 h-3 text-primary" />
                              )}
                              <span className="hidden sm:inline">Attach</span>
                            </label>

                            {/* Send / Post button */}
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                postingCommentFor === upl.id ||
                                uploadingCommentAttFor === upl.id ||
                                (!(commentDrafts[upl.id] || "").trim() && (commentAttachments[upl.id]?.length || 0) === 0)
                              }
                              onClick={() => handleAddComment(upl.id)}
                              className="h-7 px-3 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shrink-0 cursor-pointer shadow-2xs"
                            >
                              {postingCommentFor === upl.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Send</span>
                            </Button>
                          </div>

                          {/* Existing Updates & Attached Files Feed directly inside the card */}
                          {Array.isArray(upl.comments) && upl.comments.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Updates & Attached Files ({upl.comments.length}):
                              </span>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {upl.comments.map((comm) => (
                                  <div key={comm.id} className="p-2 rounded-lg bg-muted/30 border text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span className="font-semibold text-foreground">{comm.user_name}</span>
                                      <span>{new Date(comm.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    {comm.comment && <p className="text-foreground leading-relaxed">{comm.comment}</p>}
                                    {Array.isArray(comm.attachments) && comm.attachments.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {comm.attachments.map((att) => (
                                          <a
                                            key={att.id}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background border text-[11px] font-medium text-primary hover:underline shadow-2xs"
                                          >
                                            <Paperclip className="w-2.5 h-2.5" />
                                            <span className="truncate max-w-[140px]">{att.name}</span>
                                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>`;

if (oldCardPattern.test(content)) {
  content = content.replace(oldCardPattern, newCardJsx);
  console.log('Successfully integrated inline task updates & attachment composer!');
  fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');
} else {
  console.error('oldCardPattern did not match!');
  process.exit(1);
}

