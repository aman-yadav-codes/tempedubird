const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
let content = fs.readFileSync(filePath, "utf-8");

const target = `                {/* Card Footer Actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10">
                  <div className="flex items-center justify-between px-5 py-2.5 border-t bg-muted/10">
                    <div className="text-[11px] text-muted-foreground">
                      Created: {new Date(task.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </div>

                    {canEditOrRemove && (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleOpenEditTask(task)}>
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Task
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {task.deadline && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span>Deadline: {new Date(task.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
              </Card>
                  );
          })}
                </div>
      )}`;

const replacement = `                {/* Card Footer Actions */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t bg-muted/10">
                  <div className="text-[11px] text-muted-foreground">
                    Created: {new Date(task.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </div>

                  {canEditOrRemove && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleOpenEditTask(task)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Task
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {task.deadline && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span>Deadline: {new Date(task.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}`;

const normContent = content.replace(/\r\n/g, "\n");
const normTarget = target.replace(/\r\n/g, "\n");
const normReplacement = replacement.replace(/\r\n/g, "\n");

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, normReplacement);
  fs.writeFileSync(filePath, updated, "utf-8");
  console.log("Successfully fixed closing tags");
} else {
  console.error("target not found");
}

