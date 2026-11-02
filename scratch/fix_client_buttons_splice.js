const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);

const cleanClientButtons = [
  '                      <div className="flex items-center gap-2 shrink-0 ml-auto">',
  '                        <Button',
  '                          size="sm"',
  '                          onClick={() => handleOpenSubtasksModal(task)}',
  '                          className="h-8 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"',
  '                          title="Add deliverables and sub-tasks"',
  '                        >',
  '                          <Plus className="w-3.5 h-3.5" /> + Sub-Tasks',
  '                        </Button>',
  '',
  '                        <DropdownMenu>',
  '                          <DropdownMenuTrigger asChild>',
  '                            <Button',
  '                              size="icon"',
  '                              variant="ghost"',
  '                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"',
  '                              title="More project actions"',
  '                            >',
  '                              <MoreVertical className="w-4 h-4 fill-current text-red-600" />',
  '                            </Button>',
  '                          </DropdownMenuTrigger>',
  '                          <DropdownMenuContent align="end" className="w-44 text-xs font-medium">',
  '                            <DropdownMenuItem',
  '                              onClick={() => setInvoicesModalTask(task)}',
  '                              className="gap-2 cursor-pointer font-medium"',
  '                            >',
  '                              <Receipt className="w-4 h-4 text-primary" />',
  '                              <span>Invoices</span>',
  '                            </DropdownMenuItem>',
  '                            <DropdownMenuItem',
  '                              onClick={() => {',
  '                                setHistoryModalSubtask(null);',
  '                                setHistoryModalTask(task);',
  '                              }}',
  '                              className="gap-2 cursor-pointer font-medium"',
  '                            >',
  '                              <History className="w-4 h-4 text-amber-600" />',
  '                              <span>History and info</span>',
  '                            </DropdownMenuItem>',
  '                          </DropdownMenuContent>',
  '                        </DropdownMenu>',
  '                      </div>',
  '                    </div>',
];

lines.splice(2547, 72, ...cleanClientButtons);
fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
console.log("Replaced lines 2547-2618");

