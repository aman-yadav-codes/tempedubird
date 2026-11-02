const fs = require('fs');

const path = 'app/admin/operations/tasks/page.tsx';
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
const importsCheck = `import { ProjectInvoicesDialog } from "./project-invoices-dialog";`;
if (!content.includes(importsCheck)) {
  const targetImport = `import { TaskHistoryDialog } from "./task-history-dialog";`;
  const newImports = `import { TaskHistoryDialog } from "./task-history-dialog";
import { ProjectInvoicesDialog } from "./project-invoices-dialog";
import { ProjectBreakdownDialog } from "./project-breakdown-dialog";
import { SubTaskUploadDialog } from "./subtask-upload-dialog";
import { SubTaskWorkUpdateDialog } from "./subtask-work-update-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  ListTree,
  MoreVertical,
  Download,
  Upload,
  MessageSquare,
} from "lucide-react";`;
  content = content.replace(targetImport, newImports);
  console.log('1. Added dialog & icon imports');
}

// 2. Add ProjectActionDropdown Component definition if missing
if (!content.includes("function ProjectActionDropdown")) {
  const targetPlacement = `export default function OperationsTasksPage() {`;
  const dropdownComponent = `// Project Action Dropdown Component (Edit, Invoices, Breakdown, History, Adjust Score, Delete)
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
  const invoiceCount = Array.isArray((task as any).invoices) ? (task as any).invoices.length : 0;
  const extraCostNum = parseFloat(String((task as any).extra_cost || 0));

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
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1 text-xs">
        {/* 1. Edit Project */}
        {canEditOrRemove && (
          <DropdownMenuItem
            onClick={onEdit}
            className="flex items-center gap-2 cursor-pointer py-2 px-2.5 font-medium"
          >
            <Edit2 className="w-3.5 h-3.5 text-primary" />
            <span>Edit Project</span>
          </DropdownMenuItem>
        )}

        {/* 2. Invoices */}
        <DropdownMenuItem
          onClick={onInvoices}
          className="flex items-center justify-between cursor-pointer py-2 px-2.5 font-medium"
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>Invoices</span>
          </div>
          {invoiceCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold">
              {invoiceCount}
            </Badge>
          )}
        </DropdownMenuItem>

        {/* 3. Breakdown */}
        <DropdownMenuItem
          onClick={onBreakdown}
          className="flex items-center justify-between cursor-pointer py-2 px-2.5 font-medium"
        >
          <div className="flex items-center gap-2">
            <ListTree className="w-3.5 h-3.5 text-emerald-600" />
            <span>Breakdown & Scope</span>
          </div>
          {extraCostNum > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
              +{currencySymbol}{extraCostNum}
            </Badge>
          )}
        </DropdownMenuItem>

        {/* 4. Activity History */}
        <DropdownMenuItem
          onClick={onHistory}
          className="flex items-center gap-2 cursor-pointer py-2 px-2.5 font-medium text-muted-foreground hover:text-foreground"
        >
          <History className="w-3.5 h-3.5 text-amber-600" />
          <span>Activity History</span>
        </DropdownMenuItem>

        {/* 5. Adjust Score (Admin Only) */}
        {!isStaffRole && (
          <DropdownMenuItem
            onClick={onAdjustScore}
            className="flex items-center gap-2 cursor-pointer py-2 px-2.5 font-medium text-amber-700 dark:text-amber-300"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Adjust Score</span>
          </DropdownMenuItem>
        )}

        {/* 6. + Sub-Tasks */}
        <DropdownMenuItem
          onClick={onSubtasks}
          className="flex items-center gap-2 cursor-pointer py-2 px-2.5 font-semibold text-primary"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>+ Sub-Tasks</span>
        </DropdownMenuItem>

        {/* 7. Delete Project */}
        {canEditOrRemove && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={onDelete}
              className="flex items-center gap-2 cursor-pointer py-2 px-2.5 font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Project</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

`;
  content = content.replace(targetPlacement, dropdownComponent + targetPlacement);
  console.log('2. Inserted ProjectActionDropdown component');
}

// 3. Add Modal States for Invoices, Breakdown, Upload, Work Update if missing
if (!content.includes("const [invoiceModalTask, setInvoiceModalTask]")) {
  const targetState = `  const [historyModalTask, setHistoryModalTask] = useState<OperationTask | null>(null);`;
  const newStates = `  const [historyModalTask, setHistoryModalTask] = useState<OperationTask | null>(null);
  const [subtaskHistoryFilter, setSubtaskHistoryFilter] = useState<{ subtaskId?: string; subtaskTitle?: string }>({});
  const [invoiceModalTask, setInvoiceModalTask] = useState<OperationTask | null>(null);
  const [breakdownModalTask, setBreakdownModalTask] = useState<OperationTask | null>(null);
  const [uploadModalState, setUploadModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);
  const [workUpdateModalState, setWorkUpdateModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);`;
  content = content.replace(targetState, newStates);
  console.log('3. Added modal state variables');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Checkpoint 1 written!');
