const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// 1. Imports: Receipt, ListTree in lucide-react if not present
if (!code.includes('Receipt,')) {
  code = code.replace('  DollarSign,', '  DollarSign,\n  Receipt,\n  ListTree,');
}

// 2. Import ProjectInvoicesDialog and ProjectBreakdownDialog
if (!code.includes('ProjectInvoicesDialog')) {
  code = code.replace(
    'import { TaskHistoryDialog } from "./task-history-dialog";',
    `import { TaskHistoryDialog } from "./task-history-dialog";
import { ProjectInvoicesDialog } from "./project-invoices-dialog";
import { ProjectBreakdownDialog } from "./project-breakdown-dialog";`
  );
}

// 3. Add base_price, extra_cost, invoices to OperationTask type
const taskTypeOld = `  cost?: string | number | null;
  live_url?: string | null;`;
const taskTypeNew = `  cost?: string | number | null;
  base_price?: string | number | null;
  extra_cost?: string | number | null;
  invoices?: any[];
  live_url?: string | null;`;

if (code.includes(taskTypeOld)) {
  code = code.replace(taskTypeOld, taskTypeNew);
}

// 4. Add modal states: invoiceModalTask, breakdownModalTask
const stateAnchor = `  const [historyModalTask, setHistoryModalTask] = useState<OperationTask | null>(null);`;
const stateNew = `  const [historyModalTask, setHistoryModalTask] = useState<OperationTask | null>(null);
  const [invoiceModalTask, setInvoiceModalTask] = useState<OperationTask | null>(null);
  const [breakdownModalTask, setBreakdownModalTask] = useState<OperationTask | null>(null);`;

if (code.includes(stateAnchor) && !code.includes('invoiceModalTask')) {
  code = code.replace(stateAnchor, stateNew);
}

// 5. Update Card Header Top-Right Action Buttons to include:
// 1. Edit Project, 2. Invoices, 3. Breakdown
const oldCardHeaderActions = `                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHistoryModalTask(task)}
                        className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                        title="View Task History & Geolocation"
                      >
                        <History className="w-3.5 h-3.5 text-primary" /> History
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenSubtasksModal(task)}
                        className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Sub-Tasks
                      </Button>`;

const newCardHeaderActions = `                      {/* Action 1: Edit Project */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditTask(task)}
                        className="h-8 text-xs font-bold gap-1 text-foreground hover:bg-muted cursor-pointer shadow-2xs"
                        title="Edit Project details & budget"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" /> Edit Project
                      </Button>

                      {/* Action 2: Invoices */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInvoiceModalTask(task)}
                        className="h-8 text-xs font-bold gap-1 text-foreground hover:bg-muted cursor-pointer shadow-2xs border-blue-400/40 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                        title="Create & View Invoices in Pop-up"
                      >
                        <Receipt className="w-3.5 h-3.5 text-blue-600" /> Invoices
                        {Array.isArray(task.invoices) && task.invoices.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono ml-0.5">
                            {task.invoices.length}
                          </Badge>
                        )}
                      </Button>

                      {/* Action 3: Breakdown */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBreakdownModalTask(task)}
                        className="h-8 text-xs font-bold gap-1 text-foreground hover:bg-muted cursor-pointer shadow-2xs border-emerald-400/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                        title="Task breakdown with price addition for client change requests"
                      >
                        <ListTree className="w-3.5 h-3.5 text-emerald-600" /> Breakdown
                        {parseFloat(String(task.extra_cost || 0)) > 0 && (
                          <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1 font-mono ml-0.5">
                            +{getCurrencySymbol(task.currency)}{parseFloat(String(task.extra_cost)).toLocaleString("en-IN")}
                          </Badge>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHistoryModalTask(task)}
                        className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                        title="View Task History & Geolocation"
                      >
                        <History className="w-3.5 h-3.5 text-primary" /> History
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleOpenSubtasksModal(task)}
                        className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Sub-Tasks
                      </Button>`;

if (code.includes(oldCardHeaderActions)) {
  code = code.replace(oldCardHeaderActions, newCardHeaderActions);
  console.log("Updated Card Header actions with Edit Project, Invoices, Breakdown");
} else {
  // Try CRLF
  code = code.replace(oldCardHeaderActions.replace(/\n/g, '\r\n'), newCardHeaderActions.replace(/\n/g, '\r\n'));
  console.log("Updated Card Header actions (CRLF)");
}

// 6. Update Card Footer Actions to match the 3 buttons:
const oldCardFooter = `                  {canEditOrRemove && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleOpenEditTask(task)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Task
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}`;

const newCardFooter = `                  <div className="flex items-center gap-1.5">
                    {/* Action 1: Edit Project */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 font-bold gap-1"
                      onClick={() => handleOpenEditTask(task)}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-primary" /> Edit Project
                    </Button>

                    {/* Action 2: Invoices */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 font-bold gap-1 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 border-blue-300/50"
                      onClick={() => setInvoiceModalTask(task)}
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-600" /> Invoices
                    </Button>

                    {/* Action 3: Breakdown */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5 font-bold gap-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border-emerald-300/50"
                      onClick={() => setBreakdownModalTask(task)}
                    >
                      <ListTree className="w-3.5 h-3.5 text-emerald-600" /> Breakdown
                    </Button>

                    {canEditOrRemove && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 ml-1"
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>`;

if (code.includes(oldCardFooter)) {
  code = code.replace(oldCardFooter, newCardFooter);
  console.log("Updated Card Footer actions");
} else {
  code = code.replace(oldCardFooter.replace(/\n/g, '\r\n'), newCardFooter.replace(/\n/g, '\r\n'));
  console.log("Updated Card Footer actions (CRLF)");
}

// 7. Render ProjectInvoicesDialog and ProjectBreakdownDialog before end of component
const dialogAnchor = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        task={historyModalTask}
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => !open && setHistoryModalTask(null)}
      />`;

const dialogNew = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        task={historyModalTask}
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => !open && setHistoryModalTask(null)}
      />

      {/* Action 2: Project Invoices Dialog (Create Invoice & View Invoice in Pop-up) */}
      <ProjectInvoicesDialog
        task={invoiceModalTask}
        open={Boolean(invoiceModalTask)}
        onOpenChange={(open) => !open && setInvoiceModalTask(null)}
        onInvoiceUpdated={fetchTasks}
      />

      {/* Action 3: Project Breakdown Dialog (Task Breakdown with Price Addition for Extra Client Tasks) */}
      <ProjectBreakdownDialog
        task={breakdownModalTask}
        staffList={uniqueModalStaffList}
        open={Boolean(breakdownModalTask)}
        onOpenChange={(open) => !open && setBreakdownModalTask(null)}
        onTaskUpdated={fetchTasks}
      />`;

if (code.includes(dialogAnchor) && !code.includes('ProjectInvoicesDialog')) {
  code = code.replace(dialogAnchor, dialogNew);
  console.log("Rendered ProjectInvoicesDialog and ProjectBreakdownDialog");
} else {
  code = code.replace(dialogAnchor.replace(/\n/g, '\r\n'), dialogNew.replace(/\n/g, '\r\n'));
  console.log("Rendered ProjectInvoicesDialog and ProjectBreakdownDialog (CRLF)");
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log("Successfully wired Invoices & Breakdown dialogs and 3 Action buttons!");

