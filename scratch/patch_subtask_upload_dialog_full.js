const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

// 1. Add Edit2 to lucide imports
if (!content.includes('Edit2')) {
  content = content.replace(
    'import {\n  Upload,',
    'import {\n  Upload,\n  Edit2,'
  );
}

// 2. Add accessToken and getAuthHeaders
if (!content.includes('const accessToken = useAuthStore')) {
  content = content.replace(
    '  const { user } = useAuthStore();',
    `  const { user } = useAuthStore();
  const accessToken = useAuthStore((state) => state.accessToken);

  const getAuthHeaders = (extra?: Record<string, string>) => {
    const h: Record<string, string> = { ...extra };
    if (accessToken) h["Authorization"] = \`Bearer \${accessToken}\`;
    return h;
  };`
  );
}

// 3. Add edit modal state
if (!content.includes('const [editingItem, setEditingItem]')) {
  content = content.replace(
    '  const [selectedFile, setSelectedFile] = useState<File | null>(null);',
    `  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<SubTaskUploadItem | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [editItemStatus, setEditItemStatus] = useState("pending");
  const [savingEditItem, setSavingEditItem] = useState(false);`
  );
}

// 4. Add handleOpenEditItem and handleSaveEditedItem
if (!content.includes('const handleOpenEditItem =')) {
  const editHandlersCode = `
  const handleOpenEditItem = (item: SubTaskUploadItem) => {
    setEditingItem(item);
    setEditItemName(item.file_name || "");
    setEditItemNotes(item.notes || "");
    setEditItemStatus(item.status || "pending");
  };

  const handleSaveEditedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !task || !subtask) return;
    if (!editItemName.trim()) {
      toast.error("Please enter a deliverable / task name");
      return;
    }

    setSavingEditItem(true);
    try {
      const authorName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Staff Member";
      const nowIso = new Date().toISOString();

      const updatedUploads = uploadsList.map((upl) => {
        if (upl.id !== editingItem.id) return upl;

        const hist = Array.isArray(upl.status_history) ? [...upl.status_history] : [];
        if (upl.status !== editItemStatus) {
          hist.push({
            id: \`uph_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
            action: "status_changed",
            status: editItemStatus,
            previous_status: upl.status,
            changed_at: nowIso,
            changed_by_id: user?.id || null,
            changed_by_name: authorName,
            notes: \`Status updated to \${editItemStatus}\`,
          });
        }
        hist.push({
          id: \`uph_\${Date.now()}_edit\`,
          action: "item_edited",
          status: editItemStatus,
          changed_at: nowIso,
          changed_by_id: user?.id || null,
          changed_by_name: authorName,
          notes: \`Edited title/notes\`,
        });

        return {
          ...upl,
          file_name: editItemName.trim(),
          notes: editItemNotes.trim() || null,
          status: editItemStatus,
          status_modified_at: nowIso,
          status_modified_by_id: user?.id || null,
          status_modified_by_name: authorName,
          status_history: hist,
        };
      });

      setUploadsList(updatedUploads);

      const currentSubtasks = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
      const subIndex = currentSubtasks.findIndex((s) => String(s.id) === String(subtask.id));
      if (subIndex !== -1) {
        currentSubtasks[subIndex] = {
          ...currentSubtasks[subIndex],
          uploads: updatedUploads,
        };
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: task.id,
          sub_tasks: currentSubtasks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update deliverable item");

      toast.success("Deliverable item updated successfully!");
      setEditingItem(null);
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSavingEditItem(false);
    }
  };
`;
  content = content.replace('  // Dedicated reactive state for uploads', editHandlersCode + '\n  // Dedicated reactive state for uploads');
}

// 5. Update fetch calls with getAuthHeaders
content = content.replace(
  'const uploadRes = await fetch("/api/admin/uploads/documents", {\n          method: "POST",\n          body: formData,\n        });',
  'const uploadRes = await fetch("/api/admin/uploads/documents", {\n          method: "POST",\n          headers: getAuthHeaders(),\n          body: formData,\n        });'
);

content = content.replace(
  'const uploadRes = await fetch("/api/admin/uploads/documents", {\n        method: "POST",\n        body: formData,\n      });',
  'const uploadRes = await fetch("/api/admin/uploads/documents", {\n        method: "POST",\n        headers: getAuthHeaders(),\n        body: formData,\n      });'
);

content = content.replace(
  'const res = await fetch("/api/admin/uploads/documents", {\n        method: "POST",\n        body: formData,\n      });',
  'const res = await fetch("/api/admin/uploads/documents", {\n        method: "POST",\n        headers: getAuthHeaders(),\n        body: formData,\n      });'
);

content = content.replace(
  /const saveRes = await fetch\("\/api\/admin\/operations\/tasks", \{\s*method: "PUT",\s*headers: \{ "Content-Type": "application\/json" \},/g,
  'const saveRes = await fetch("/api/admin/operations/tasks", {\n        method: "PUT",\n        headers: getAuthHeaders({ "Content-Type": "application/json" }),'
);

// 6. Ensure handleUploadSubmit clears selectedFile and file input, and allows images without text
const fileSubmitCheck = 'if (!selectedFile && !uploadNotes.trim()) {\n      toast.error("Please choose a file or enter task notes");\n      return;\n    }';
if (!content.includes('Please choose a file or enter task notes')) {
  content = content.replace(
    'const handleUploadSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n\n    setUploading(true);',
    `const handleUploadSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!task || !subtask) return;\n    ${fileSubmitCheck}\n\n    setUploading(true);`
  );
}

// Clear selected file and notes on submit success
if (!content.includes('setSelectedFile(null);\n      setUploadNotes("");\n      const fileInputEl')) {
  content = content.replace(
    'toast.success(toastMsg);\n      if (onSaved) onSaved();',
    `setSelectedFile(null);
      setUploadNotes("");
      const fileInputEl = document.getElementById("subtask-file-input") as HTMLInputElement | null;
      if (fileInputEl) fileInputEl.value = "";
      toast.success(toastMsg);
      if (onSaved) onSaved();`
  );
}

// 7. Add Edit icon button right where the user circled (next to History button in row actions)
const historyBtnMarker = '<History className="w-3.5 h-3.5" />\n                          </Button>';
const editBtnJsx = `<History className="w-3.5 h-3.5" />
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
                          </Button>`;

if (content.includes(historyBtnMarker)) {
  content = content.replace(historyBtnMarker, editBtnJsx);
  console.log('Added Edit icon button to row actions!');
} else {
  console.error('History button marker not found!');
}

// 8. Add the Edit Dialog modal in JSX
const editDialogJsx = `
      {/* Edit Deliverable / Task Modal Dialog */}
      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-5 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Edit2 className="w-4 h-4 text-primary" />
              <span>Edit Deliverable / Task</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the deliverable title, notes, or verification status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEditedItem} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Deliverable / Task Name *</Label>
              <Input
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                placeholder="e.g. Design Wireframes, Code Review..."
                className="text-xs h-9 bg-background"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description / Notes</Label>
              <Textarea
                value={editItemNotes}
                onChange={(e) => setEditItemNotes(e.target.value)}
                placeholder="Optional details, links, or comments for this deliverable..."
                rows={3}
                className="text-xs bg-background leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Verification Status</Label>
              <select
                value={editItemStatus}
                onChange={(e) => setEditItemStatus(e.target.value)}
                className={\`w-full h-9 text-xs font-bold rounded-md border px-3 outline-none cursor-pointer bg-background \${getUploadStatusSelectClass(editItemStatus)}\`}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="ready_for_testing">Ready for testing</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="stuck">Stuck</option>
                <option value="awaiting_confirmation">Awaiting confirmation</option>
                {editItemStatus === "completed" && <option value="completed">Completed</option>}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="h-8 text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEditItem}
                className="h-8 px-4 text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {savingEditItem ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
`;

if (!content.includes('Edit Deliverable / Task Modal Dialog')) {
  content = content.replace('    </Dialog>\n  );', editDialogJsx + '\n    </Dialog>\n  );');
  console.log('Appended Edit Dialog modal in JSX!');
}

fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');
console.log('Successfully patched subtask-upload-dialog.tsx!');

