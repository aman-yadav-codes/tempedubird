const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

// 1. Add Maximize2 to lucide-react imports if not already present
if (!content.includes('Maximize2,')) {
  content = content.replace(
    '  Upload,\n  Edit2,',
    '  Upload,\n  Edit2,\n  Maximize2,'
  );
}

// 2. Add previewModalItem state and isImageAttachment helper
if (!content.includes('previewModalItem')) {
  const targetState = 'const [postingCommentFor, setPostingCommentFor] = useState<string | null>(null);';
  const addition = `const [postingCommentFor, setPostingCommentFor] = useState<string | null>(null);

  // Lightbox / Image Preview Popup state
  const [previewModalItem, setPreviewModalItem] = useState<{
    url: string;
    name: string;
    userName?: string;
    userRole?: string;
    message?: string;
    date?: string;
    type?: string;
    size?: number;
  } | null>(null);

  const isImageAttachment = (url?: string, name?: string, type?: string) => {
    if (type && type.startsWith("image/")) return true;
    const target = \`\${url || ""} \${name || ""}\`.toLowerCase();
    return Boolean(target.match(/\\.(png|jpg|jpeg|webp|gif|svg)(\\?|$)/i));
  };`;
  content = content.replace(targetState, addition);
}

// 3. Make deliverable file_name trigger preview popup when clicked
const targetFileName = `{hasUrl ? (
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
                            )}`;

const newFileName = `{hasUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalItem({
                                    url: upl.file_url,
                                    name: upl.file_name,
                                    userName: upl.uploaded_by_name,
                                    userRole: upl.uploaded_by_role,
                                    message: upl.notes || undefined,
                                    date: upl.uploaded_at,
                                    type: upl.file_type,
                                    size: upl.file_size,
                                  })
                                }
                                className="font-bold text-foreground hover:text-primary hover:underline truncate block text-left cursor-pointer"
                                title="Click to view file & notes"
                              >
                                {upl.file_name}
                              </button>
                            ) : (
                              <span className="font-bold text-foreground truncate block">
                                {upl.file_name}
                              </span>
                            )}`;

if (content.includes(targetFileName)) {
  content = content.replace(targetFileName, newFileName);
}

// 4. Remove View and Download buttons from top actions row (User request: remove View and Download)
const viewAndDownloadPattern = /\{\/\* View in browser \*\/\}[\s\S]*?\{\/\* Download \*\/\}[\s\S]*?<\/a>\s*\)\}/;
if (viewAndDownloadPattern.test(content)) {
  content = content.replace(viewAndDownloadPattern, '');
  console.log('Removed View and Download buttons from top actions row.');
} else {
  console.log('Could not find viewAndDownloadPattern via regex, attempting string replacement.');
}

// 5. Replace Existing Updates & Attached Files Feed directly inside the card with thumbnail boxes
const oldFeedPattern = /\{\/\* Existing Updates & Attached Files Feed directly inside the card \*\/\}[\s\S]*?\{\/\* =========================================================================\s*RIGHT-SIDE PANEL/;

const newFeedJsx = `{/* Existing Updates & Attached Files Feed directly inside the card */}
                          {Array.isArray(upl.comments) && upl.comments.length > 0 && (() => {
                            const allAttachedItems: {
                              att: SubTaskCommentAttachment;
                              comm: SubTaskUploadComment;
                            }[] = [];

                            const textOnlyComments: SubTaskUploadComment[] = [];

                            upl.comments.forEach((comm) => {
                              if (Array.isArray(comm.attachments) && comm.attachments.length > 0) {
                                comm.attachments.forEach((att) => {
                                  allAttachedItems.push({ att, comm });
                                });
                              }
                              if (comm.comment && comm.comment.trim() && (!comm.attachments || comm.attachments.length === 0)) {
                                textOnlyComments.push(comm);
                              }
                            });

                            if (allAttachedItems.length === 0 && textOnlyComments.length === 0) return null;

                            return (
                              <div className="space-y-2 pt-1 border-t border-border/50">
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  <span>Updates & Attached Files ({allAttachedItems.length + textOnlyComments.length}):</span>
                                  {allAttachedItems.length > 0 && (
                                    <span className="text-[9px] font-normal lowercase text-muted-foreground/80">
                                      click image to preview with message
                                    </span>
                                  )}
                                </div>

                                {/* Attached Images & Files shown in horizontal row of square thumbnail boxes */}
                                {allAttachedItems.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                                    {allAttachedItems.map(({ att, comm }, attIdx) => {
                                      const isImg = isImageAttachment(att.url, att.name, att.type);
                                      return (
                                        <div
                                          key={att.id || \`att_\${attIdx}\`}
                                          onClick={() =>
                                            setPreviewModalItem({
                                              url: att.url,
                                              name: att.name,
                                              userName: comm.user_name,
                                              userRole: comm.user_role,
                                              message: comm.comment || undefined,
                                              date: comm.created_at,
                                              type: att.type,
                                              size: att.size,
                                            })
                                          }
                                          className="group relative flex flex-col justify-between w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-border bg-card hover:border-primary/60 hover:shadow-md cursor-pointer transition-all overflow-hidden shrink-0 select-none shadow-2xs"
                                          title={\`Click to preview: \${att.name}\${comm.comment ? \`\\nMessage: "\${comm.comment}"\` : ""}\`}
                                        >
                                          {/* Top: Author header */}
                                          <div className="w-full px-1.5 py-0.5 bg-muted/80 border-b flex items-center justify-between text-[9px] font-bold text-foreground truncate shrink-0">
                                            <span className="truncate">{comm.user_name}</span>
                                            {comm.comment && (
                                              <MessageSquare className="w-2.5 h-2.5 text-primary shrink-0 ml-1" />
                                            )}
                                          </div>

                                          {/* Center: Image or file preview */}
                                          <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-muted/15 relative">
                                            {isImg ? (
                                              <>
                                                <img
                                                  src={att.url}
                                                  alt={att.name}
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                                                </div>
                                              </>
                                            ) : (
                                              <div className="flex flex-col items-center justify-center p-1 text-center">
                                                <Paperclip className="w-4 h-4 text-primary mb-0.5" />
                                                <span className="text-[8px] font-mono uppercase text-muted-foreground font-bold">
                                                  {att.name.split(".").pop() || "FILE"}
                                                </span>
                                              </div>
                                            )}
                                          </div>

                                          {/* Bottom: Filename */}
                                          <div className="w-full px-1 py-0.5 bg-background border-t text-[9px] text-muted-foreground truncate text-center shrink-0">
                                            <span className="truncate block font-medium">{att.name}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Text-only comments / updates */}
                                {textOnlyComments.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    {textOnlyComments.map((comm) => (
                                      <div key={comm.id} className="p-2 rounded-lg bg-muted/30 border text-xs space-y-0.5">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                          <span className="font-semibold text-foreground flex items-center gap-1">
                                            <User className="w-2.5 h-2.5 text-primary" />
                                            {comm.user_name} {comm.user_role ? \`(\${comm.user_role})\` : ""}
                                          </span>
                                          <span>
                                            {new Date(comm.created_at).toLocaleString("en-IN", {
                                              day: "numeric",
                                              month: "short",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                        </div>
                                        <p className="text-foreground leading-relaxed pl-3.5 font-medium">{comm.comment}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* =========================================================================
              RIGHT-SIDE PANEL`;

if (oldFeedPattern.test(content)) {
  content = content.replace(oldFeedPattern, newFeedJsx);
  console.log('Successfully replaced old comments feed with thumbnail cards layout.');
} else {
  console.error('Failed to match oldFeedPattern.');
}

// 6. Mount the Image Preview Dialog right before closing </Dialog>
const previewModalJsx = `
      {/* Lightbox / Preview Popup for Images and Attachments with Associated Message */}
      {previewModalItem && (
        <Dialog open={!!previewModalItem} onOpenChange={(open) => !open && setPreviewModalItem(null)}>
          <DialogContent className="max-w-2xl w-full p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl flex flex-col max-h-[90vh] z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate text-foreground">
                    {previewModalItem.name || "Attachment Preview"}
                  </h3>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {previewModalItem.userName || "Staff Member"} {previewModalItem.userRole ? \`(\${previewModalItem.userRole})\` : ""}
                    </span>
                    {previewModalItem.date && (
                      <>
                        <span>•</span>
                        <span>
                          {new Date(previewModalItem.date).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Image Preview Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-muted/15 min-h-[260px] max-h-[55vh]">
              {isImageAttachment(previewModalItem.url, previewModalItem.name, previewModalItem.type) ? (
                <img
                  src={previewModalItem.url}
                  alt={previewModalItem.name}
                  className="max-h-[50vh] max-w-full w-auto object-contain rounded-lg border shadow-sm bg-background/90"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Paperclip className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{previewModalItem.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Non-image file</p>
                  </div>
                </div>
              )}
            </div>

            {/* Associated Message / Notes Callout & Actions */}
            <div className="p-4 border-t bg-background shrink-0 space-y-3">
              {previewModalItem.message ? (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Associated Message:</span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed pl-5 font-medium">
                    {previewModalItem.message}
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-muted/30 border text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 opacity-60" />
                  <span>No text message associated with this image.</span>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {previewModalItem.url && (
                    <a
                      href={previewModalItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-primary transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in New Tab</span>
                    </a>
                  )}
                  {previewModalItem.url && (
                    <a
                      href={previewModalItem.url}
                      download={previewModalItem.name || "attachment"}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewModalItem(null)}
                  className="text-xs font-medium cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}`;

if (!content.includes('previewModalItem && (')) {
  content = content.replace(/\s*<\/Dialog>\s*\);\s*\}\s*$/, previewModalJsx + '\n}\n');
  console.log('Appended previewModalItem Dialog popup.');
}

fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');
console.log('Successfully updated subtask-upload-dialog.tsx!');

