const fs = require('fs');
let content = fs.readFileSync('components/subtask-card.tsx', 'utf8');

// 1. Add imports if not present
if (!content.includes('import { Checkbox }')) {
  content = content.replace(
    `import { Button } from "@/components/ui/button";`,
    `import { Button } from "@/components/ui/button";\r\nimport { Checkbox } from "@/components/ui/checkbox";`
  );
}

content = content.replace(
  `  Trash2,\r\n} from "lucide-react";`,
  `  Trash2,\r\n  Users,\r\n  Check,\r\n  ChevronDown,\r\n} from "lucide-react";`
);

// 2. Add currentAssignedIds, handleToggleAssignee, handleClearAssignees before handleStatusSelect
const oldHandlersTarget = `  const handleStatusSelect = (val: string) => {`;
const newHandlers = `  // Multi-employee assignees support
  const currentAssignedIds: string[] = React.useMemo(() => {
    if (Array.isArray(subtask.assigned_employees) && subtask.assigned_employees.length > 0) {
      return subtask.assigned_employees.map((e: any) => String(e.id || e.user_id));
    }
    if (subtask.assigned_employee_name) {
      const names = subtask.assigned_employee_name.split(",").map((x: string) => x.trim().toLowerCase());
      const matched = effectiveStaffOptions.filter((s) => names.includes(s.name.toLowerCase()));
      if (matched.length > 0) return matched.map((s) => String(s.id));
    }
    if (subtask.assigned_employee_id) return [String(subtask.assigned_employee_id)];
    return [];
  }, [subtask.assigned_employees, subtask.assigned_employee_name, subtask.assigned_employee_id, effectiveStaffOptions]);

  const handleToggleAssignee = (empId: string) => {
    let nextIds: string[];
    if (currentAssignedIds.includes(empId)) {
      nextIds = currentAssignedIds.filter((id) => id !== empId);
    } else {
      nextIds = [...currentAssignedIds, empId];
    }
    const selectedEmps = effectiveStaffOptions.filter((s) => nextIds.includes(String(s.id)));
    const names = selectedEmps.map((s) => s.name).join(", ");
    const primaryId = selectedEmps[0] ? Number(selectedEmps[0].id) : null;
    const primaryRole = selectedEmps[0]?.role || null;
    onUpdateSubtask(task, subtask.id, {
      assigned_employees: selectedEmps,
      assigned_employee_name: names || null,
      assigned_employee_id: primaryId,
      assigned_employee_role: primaryRole,
    });
  };

  const handleClearAssignees = () => {
    onUpdateSubtask(task, subtask.id, {
      assigned_employees: [],
      assigned_employee_name: null,
      assigned_employee_id: null,
      assigned_employee_role: null,
    });
  };

  const handleStatusSelect = (val: string) => {`;

content = content.replace(oldHandlersTarget, newHandlers);

// 3. Replace Assignee Dropdown with Multi-select DropdownMenu
const oldAssigneeBlock = `        {/* Directly Editable Assignee Dropdown */}
        <div className="flex items-center gap-1 shrink-0">
          <User className="w-3.5 h-3.5 text-primary shrink-0" />
          <select
            value={subtask.assigned_employee_id ? String(subtask.assigned_employee_id) : "none"}
            onChange={(e) => handleAssigneeChange(e.target.value)}
            className="h-6 text-[11px] font-semibold rounded-md border border-input bg-background/90 hover:bg-muted/40 px-2 outline-none cursor-pointer text-foreground max-w-[180px] truncate shadow-2xs"
            title="Directly assign sub-task to any employee on this project"
          >
            <option value="none">-- Unassigned --</option>
            {effectiveStaffOptions.map((emp) => (
              <option key={emp.id} value={String(emp.id)}>
                {emp.name} {emp.role ? \`(\${emp.role})\` : ""}
              </option>
            ))}
          </select>
        </div>`;

const newAssigneeBlock = `        {/* Multi-Employee Assignee Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 h-6 text-[11px] font-semibold rounded-md border border-input bg-background/90 hover:bg-muted/40 px-2 outline-none cursor-pointer text-foreground max-w-[200px] truncate shadow-2xs shrink-0"
              title="Assign one or multiple team members to this sub-task"
            >
              <Users className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">
                {currentAssignedIds.length === 0
                  ? "-- Unassigned --"
                  : currentAssignedIds.length === 1
                  ? (effectiveStaffOptions.find((s) => String(s.id) === currentAssignedIds[0])?.name || subtask.assigned_employee_name || "1 staff")
                  : \`\${currentAssignedIds.length} Team Members (\${effectiveStaffOptions.filter((s) => currentAssignedIds.includes(String(s.id))).map((s) => s.name).join(", ")})\`}
              </span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2 space-y-1.5 z-50">
            <div className="flex items-center justify-between border-b pb-1 px-1">
              <span className="text-[11px] font-bold text-foreground">Assign Project Team</span>
              {currentAssignedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAssignees}
                  className="text-[10px] text-destructive hover:underline font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {effectiveStaffOptions.length === 0 ? (
                <div className="text-center py-2 text-xs text-muted-foreground">No project team members found</div>
              ) : (
                effectiveStaffOptions.map((emp) => {
                  const isChecked = currentAssignedIds.includes(String(emp.id));
                  return (
                    <div
                      key={emp.id}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleAssignee(String(emp.id));
                      }}
                      className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/80 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Checkbox checked={isChecked} onCheckedChange={() => handleToggleAssignee(String(emp.id))} />
                        <span className="font-medium text-foreground truncate">{emp.name}</span>
                        {emp.role && <span className="text-[10px] text-muted-foreground truncate">({emp.role})</span>}
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                    </div>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>`;

content = content.replace(oldAssigneeBlock.replace(/\r\n/g, '\n'), newAssigneeBlock);
content = content.replace(oldAssigneeBlock, newAssigneeBlock);

fs.writeFileSync('components/subtask-card.tsx', content, 'utf8');
console.log('Successfully updated components/subtask-card.tsx');

