const fs = require('fs');
let content = fs.readFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', 'utf8');

const target = 'title="Open File History in Sidebar"\n                          >\n                            <History className="w-3.5 h-3.5" />\n                          </Button>';

const replacement = `title="Open File History in Sidebar"
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
                          </Button>`;

const targetCRLF = target.replace(/\n/g, '\r\n');
const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (content.includes(targetCRLF)) {
  content = content.replace(targetCRLF, replacementCRLF);
  console.log('Inserted Edit button (CRLF)!');
} else if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log('Inserted Edit button (LF)!');
} else {
  console.error('Target not found!');
  process.exit(1);
}

fs.writeFileSync('app/admin/operations/tasks/subtask-upload-dialog.tsx', content, 'utf8');

