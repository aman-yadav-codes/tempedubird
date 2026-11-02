const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

// 1. Add MoreVertical to lucide imports if not present
if (!code.includes('MoreVertical,')) {
  code = code.replace('  MessageSquare,', '  MessageSquare,\n  MoreVertical,');
  console.log('Added MoreVertical to lucide imports');
}

// 2. Add DropdownMenu imports if not present
if (!code.includes('DropdownMenuTrigger')) {
  code = code.replace(
    'import { SubTaskWorkUpdateDialog } from "./subtask-work-update-dialog";',
    `import { SubTaskWorkUpdateDialog } from "./subtask-work-update-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";`
  );
  console.log('Added DropdownMenu imports');
}

// 3. Add ProjectActionDropdown component definition before export default function TasksPage
const projectActionDropdownComp = `// Project Action Dropdown Component (Edit, Invoices, Breakdown, History, Adjust Score, Delete)
function ProjectActionDropdown({
  task,
  onEdit,
  onInvoices,
  onBreakdown,
  onHistory,
  onAdjustScore,
  onSubtasks,
  onDelete,
  isStaffRole,
  canEditOrRemove,
  currencySymbol,
}: {
  task: OperationTask;
  onEdit: () => void;
  onInvoices: () => void;
  onBreakdown: () => void;
  onHistory: () => void;
  onAdjustScore: () => void;
  onSubtasks: () => void;
  onDelete: () => void;
  isStaffRole: boolean;
  canEditOrRemove: boolean;
  currencySymbol: string;
}) {
  const invoiceCount = Array.isArray(task.invoices) ? task.invoices.length : 0;
  const extraCostNum = parseFloat(String(task.extra_cost || 0));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground shadow-2xs"
          title="Project options & actions"
        >
          <MoreVertical className="w-4 h-4 text-foreground" />
          <span className="sr-only">Project options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg">
        {/* 1. Edit Project */}
        <DropdownMenuItem
          onClick={onEdit}
          className="cursor-pointer gap-2 py-2 text-xs font-semibold"
        >
          <Edit2 className="w-4 h-4 text-primary shrink-0" />
          <span>Edit Project</span>
        </DropdownMenuItem>

        {/* 2. Invoices */}
        <DropdownMenuItem
          onClick={onInvoices}
          className="cursor-pointer gap-2 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 focus:text-blue-700"
        >
          <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex items-center justify-between flex-1">
            <span>Invoices</span>
            {invoiceCount > 0 && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono ml-auto">
                {invoiceCount}
              </Badge>
            )}
          </div>
        </DropdownMenuItem>

        {/* 3. Breakdown */}
        <DropdownMenuItem
          onClick={onBreakdown}
          className="cursor-pointer gap-2 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 focus:text-emerald-700"
        >
          <ListTree className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex items-center justify-between flex-1">
            <span>Breakdown</span>
            {extraCostNum > 0 && (
              <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1 font-mono ml-auto">
                +{currencySymbol}{extraCostNum.toLocaleString("en-IN")}
              </Badge>
            )}
          </div>
        </DropdownMenuItem>

        {/* 4. History */}
        <DropdownMenuItem
          onClick={onHistory}
          className="cursor-pointer gap-2 py-2 text-xs font-semibold"
        >
          <History className="w-4 h-4 text-primary shrink-0" />
          <span>Activity History</span>
        </DropdownMenuItem>

        {/* 5. Adjust Score (Admin Only) */}
        {!isStaffRole && (
          <DropdownMenuItem
            onClick={onAdjustScore}
            className="cursor-pointer gap-2 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 focus:text-amber-700"
          >
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Adjust Score</span>
          </DropdownMenuItem>
        )}

        {/* 6. Sub-Tasks */}
        <DropdownMenuItem
          onClick={onSubtasks}
          className="cursor-pointer gap-2 py-2 text-xs font-semibold"
        >
          <Plus className="w-4 h-4 text-primary shrink-0" />
          <span>+ Sub-Tasks</span>
        </DropdownMenuItem>

        {/* 7. Delete Project */}
        {canEditOrRemove && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={onDelete}
              className="cursor-pointer gap-2 py-2 text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 text-destructive shrink-0" />
              <span>Delete Project</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}`;

if (!code.includes('function ProjectActionDropdown')) {
  code = code.replace(
    'export default function TasksPage() {',
    `${projectActionDropdownComp}\n\nexport default function TasksPage() {`
  );
  console.log('Added ProjectActionDropdown component');
}

// 4. In Top Header: Replace the 5 buttons with + Sub-Tasks and the dropdown
const oldHeaderButtons = `                      {/* Adjust Score button — admin only */}
                      {!isStaffRole && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAdjustScore(task)}
                          title="Add manual bonus or penalty score"
                          className="h-8 text-xs font-bold gap-1 border-amber-400/60 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                        >
                          <Trophy className="w-3.5 h-3.5" /> Adjust Score
                        </Button>
                      )}

                      {/* Action 1: Edit Project */}
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

const newHeaderButtons = `                      <Button
                        size="sm"
                        onClick={() => handleOpenSubtasksModal(task)}
                        className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Sub-Tasks
                      </Button>

                      {/* Actions Dropdown Menu (Adjust Score, Edit, Invoices, Breakdown, History, Delete) */}
                      <ProjectActionDropdown
                        task={task}
                        onEdit={() => handleOpenEditTask(task)}
                        onInvoices={() => setInvoiceModalTask(task)}
                        onBreakdown={() => setBreakdownModalTask(task)}
                        onHistory={() => {
                          setHistoryModalTask(task);
                          setSubtaskHistoryFilter({});
                        }}
                        onAdjustScore={() => handleOpenAdjustScore(task)}
                        onSubtasks={() => handleOpenSubtasksModal(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        isStaffRole={isStaffRole}
                        canEditOrRemove={canEditOrRemove}
                        currencySymbol={getCurrencySymbol(task.currency)}
                      />`;

if (code.includes(oldHeaderButtons)) {
  code = code.replace(oldHeaderButtons, newHeaderButtons);
  console.log('Replaced header buttons with ProjectActionDropdown');
} else if (code.includes(oldHeaderButtons.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldHeaderButtons.replace(/\n/g, '\r\n'), newHeaderButtons.replace(/\n/g, '\r\n'));
  console.log('Replaced header buttons with ProjectActionDropdown (CRLF)');
} else {
  console.error('oldHeaderButtons not found!');
}

// 5. In Summary Bar: Add ProjectActionDropdown on the right side (exactly where user drew red box)
const oldSummaryBar = `                  {/* Summary Bar: Total Cost, Duration, Sub-Tasks Progress */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                        {formatPriceDisplay(totalCost, task.currency)}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {totalHoursDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Sub-Tasks</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {completedSubs}/{subTasksList.length} Done
                      </span>
                    </div>
                  </div>`;

const newSummaryBar = `                  {/* Summary Bar: Total Cost, Duration, Sub-Tasks Progress & Action Dropdown */}
                  <div className="flex items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                        <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                          {formatPriceDisplay(totalCost, task.currency)}
                        </span>
                      </div>
                      <div className="border-l pl-3">
                        <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Duration</span>
                        <span className="font-bold text-foreground font-mono text-sm">
                          {totalHoursDisplay}
                        </span>
                      </div>
                      <div className="border-l pl-3">
                        <span className="text-muted-foreground block text-[10px] font-medium uppercase">Sub-Tasks</span>
                        <span className="font-bold text-foreground font-mono text-sm">
                          {completedSubs}/{subTasksList.length} Done
                        </span>
                      </div>
                    </div>

                    {/* Actions Dropdown (where drawn in user sketch) */}
                    <div className="border-l pl-3 shrink-0">
                      <ProjectActionDropdown
                        task={task}
                        onEdit={() => handleOpenEditTask(task)}
                        onInvoices={() => setInvoiceModalTask(task)}
                        onBreakdown={() => setBreakdownModalTask(task)}
                        onHistory={() => {
                          setHistoryModalTask(task);
                          setSubtaskHistoryFilter({});
                        }}
                        onAdjustScore={() => handleOpenAdjustScore(task)}
                        onSubtasks={() => handleOpenSubtasksModal(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                        isStaffRole={isStaffRole}
                        canEditOrRemove={canEditOrRemove}
                        currencySymbol={getCurrencySymbol(task.currency)}
                      />
                    </div>
                  </div>`;

if (code.includes(oldSummaryBar)) {
  code = code.replace(oldSummaryBar, newSummaryBar);
  console.log('Updated summary bar with ProjectActionDropdown');
} else if (code.includes(oldSummaryBar.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldSummaryBar.replace(/\n/g, '\r\n'), newSummaryBar.replace(/\n/g, '\r\n'));
  console.log('Updated summary bar with ProjectActionDropdown (CRLF)');
} else {
  console.error('oldSummaryBar not found!');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log('Successfully completed dropdown menu update in page.tsx!');

