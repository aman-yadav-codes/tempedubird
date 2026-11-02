const fs = require('fs');

let content = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// 1. Add import for SubtaskModalDialog
if (!content.includes('import { SubtaskModalDialog }')) {
  content = content.replace(
    'import { SubtaskCard } from "@/components/subtask-card";',
    'import { SubtaskCard } from "@/components/subtask-card";\nimport { SubtaskModalDialog } from "@/components/subtask-modal-dialog";'
  );
}

// 2. Add state for editingSubtaskObject
if (!content.includes('editingSubtaskObject')) {
  content = content.replace(
    'const [selectedTaskForSubtasks, setSelectedTaskForSubtasks] = useState<OperationTask | null>(null);',
    'const [selectedTaskForSubtasks, setSelectedTaskForSubtasks] = useState<OperationTask | null>(null);\n  const [editingSubtaskObject, setEditingSubtaskObject] = useState<SubTask | null>(null);'
  );
}

// 3. Update handleOpenEditSubtask
const editSubtaskHandlerPattern = /const handleOpenEditSubtask = \(task: OperationTask, sub: SubTask\) => \{[\s\S]*?setEditSubtaskDialogOpen\(true\);\s*\};/;
const newEditSubtaskHandler = `const handleOpenEditSubtask = (task: OperationTask, sub: SubTask) => {
    setSelectedTaskForSubtasks(task);
    setEditingSubtaskObject(sub);
    setSubtaskModalOpen(true);
  };`;

content = content.replace(editSubtaskHandlerPattern, newEditSubtaskHandler);

// 4. Update handleOpenSubtasksModal to reset editingSubtaskObject
content = content.replace(
  'setSelectedTaskForSubtasks(task);',
  'setSelectedTaskForSubtasks(task);\n    setEditingSubtaskObject(null);'
);

// 5. Replace Modal 2 block with <SubtaskModalDialog ... />
const modal2Start = '{/* MODAL 2: Dedicated Sub-Tasks Manager Modal */}';
const modal2EndMarker = '{/* Modal 3: Submit Task Under Review Dialog (Optional Text & Image) */}';

const m2StartIdx = content.indexOf(modal2Start);
const m2EndIdx = content.indexOf(modal2EndMarker);

if (m2StartIdx === -1 || m2EndIdx === -1) {
  console.error('Modal 2 boundary not found!', { m2StartIdx, m2EndIdx });
  process.exit(1);
}

const unifiedDialogJsx = `{/* Unified Sub-Tasks Add & Edit Dialog */}
      <SubtaskModalDialog
        open={subtaskModalOpen}
        onOpenChange={(open) => {
          setSubtaskModalOpen(open);
          if (!open) {
            setEditingSubtaskObject(null);
          }
        }}
        task={selectedTaskForSubtasks}
        editingSubtask={editingSubtaskObject}
        staffOptions={subtaskAssigneeOptions}
        isStaffViewer={isStaffViewer}
        onSaved={fetchTasks}
        onOpenHistory={(t, s) => {
          setHistoryModalSubtask(s || null);
          setHistoryModalTask(t);
        }}
      />\n\n      `;

content = content.slice(0, m2StartIdx) + unifiedDialogJsx + content.slice(m2EndIdx);

// 6. Remove the old Edit Subtask dialog (MODAL 3)
const modal3EditStart = '{/* MODAL 3: Edit Deliverable / Sub-Task Dialog */}';
const modal3EditEndMarker = '{/* Task History & Geolocation Audit Trail Dialog */}';

const m3StartIdx = content.indexOf(modal3EditStart);
const m3EndIdx = content.indexOf(modal3EditEndMarker);

if (m3StartIdx !== -1 && m3EndIdx !== -1) {
  content = content.slice(0, m3StartIdx) + content.slice(m3EndIdx);
  console.log('Removed old Modal 3 Edit Subtask Dialog!');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', content, 'utf8');
console.log('Successfully updated tasks page to use unified SubtaskModalDialog!');

