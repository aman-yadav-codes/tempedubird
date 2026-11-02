const fs = require('fs');

const path = 'app/admin/operations/tasks/page.tsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const target = `                              <div className="flex items-center gap-1.5 shrink-0">
                                {getUrgencyBadge(sub.urgency)}`;

const replacement = `                              <div className="flex items-center gap-1.5 shrink-0">
                                {getUrgencyBadge(sub.urgency)}
                                <Button
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
                                </Button>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Inserted History button into subtask card header!');
} else {
  console.log('Target not found!');
}
