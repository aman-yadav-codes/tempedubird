const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

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
  const target = isCRLF
    ? '\r\nexport default function OperationsTasksPage() {'
    : '\nexport default function OperationsTasksPage() {';
  const replacement = `${nl}${nl}${projectActionDropdownComp}${nl}${nl}export default function OperationsTasksPage() {`;

  code = code.replace(target, replacement);
  console.log('Successfully inserted ProjectActionDropdown component');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');

