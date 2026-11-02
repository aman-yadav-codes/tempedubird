const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);

const correctLines = [
  '                {/* Card Footer Actions */}',
  '                <div className="flex items-center justify-between px-5 py-2.5 border-t bg-muted/10">',
  '                  <div className="text-[11px] text-muted-foreground">',
  '                    Created: {new Date(task.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}',
  '                  </div>',
  '',
  '                  {canEditOrRemove && (',
  '                    <div className="flex items-center gap-1">',
  '                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleOpenEditTask(task)}>',
  '                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Task',
  '                      </Button>',
  '                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>',
  '                        <Trash2 className="w-3.5 h-3.5" />',
  '                      </Button>',
  '                      {task.deadline && (',
  '                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">',
  '                          <Clock className="w-3 h-3 text-muted-foreground" />',
  '                          <span>Deadline: {new Date(task.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>',
  '                        </div>',
  '                      )}',
  '                    </div>',
  '                  )}',
  '                </div>',
  '              </Card>',
  '            );',
  '          })}',
  '        </div>',
  '      )}',
];

lines.splice(3055, 26, ...correctLines);
fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
console.log("Successfully replaced lines 3055-3080");

