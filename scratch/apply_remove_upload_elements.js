const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

// 1. Update the form to remove:
// - Header label & supports text
// - File input & choose file button
// - Tip text at bottom
// Replace with streamlined single-row input + Create task button
const oldFormStart = '{/* Upload New File Form */}';
const oldFormEnd = '</form>';

const formStartIndex = content.indexOf(oldFormStart);
const formEndIndex = content.indexOf(oldFormEnd, formStartIndex);

if (formStartIndex === -1 || formEndIndex === -1) {
  console.error('Form boundaries not found!', { formStartIndex, formEndIndex });
  process.exit(1);
}

const newFormJsx = `{/* Task Creation Form (Clean single row, Ctrl+V paste supported) */}
            <form
              onSubmit={handleUploadSubmit}
              onPaste={handlePasteImages}
              className="p-3 rounded-xl border border-primary/30 bg-primary/5 relative group"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  onPaste={handlePasteImages}
                  placeholder="Optional description / notes for this task (or paste multiple screenshots directly here with Ctrl+V)..."
                  className="text-xs h-9 bg-background flex-1"
                  autoFocus
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={uploading}
                  className="bg-primary hover:bg-primary/90 font-bold text-xs gap-1.5 shrink-0 cursor-pointer h-9 px-4"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{uploading ? "Creating..." : "+ Create task"}</span>
                </Button>
              </div>
            </form>`;

content = content.slice(0, formStartIndex) + newFormJsx + content.slice(formEndIndex + oldFormEnd.length);
console.log('Replaced top form with clean single-row input and button!');

// 2. Remove thumbnail previews / icons on the left of each row (Image 2 red box)
const thumbnailStart = '{/* Show image thumbnail if image, task icon if no file, else file icon */}';
const thumbnailEnd = '<div className="min-w-0 flex-1 space-y-0.5">';

const thumbStartIndex = content.indexOf(thumbnailStart);
const thumbEndIndex = content.indexOf(thumbnailEnd, thumbStartIndex);

if (thumbStartIndex === -1 || thumbEndIndex === -1) {
  console.error('Thumbnail boundaries not found!', { thumbStartIndex, thumbEndIndex });
  process.exit(1);
}

// Remove from thumbnailStart to thumbEndIndex, keeping `<div className="min-w-0 flex-1 space-y-0.5">`
content = content.slice(0, thumbStartIndex) + content.slice(thumbEndIndex);
console.log('Removed left thumbnail previews/icons from items list!');

fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');
console.log('Successfully updated subtask-upload-dialog.tsx!');

