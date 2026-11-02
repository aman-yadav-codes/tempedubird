const fs = require('fs');

let content = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8');

// 1. Add import
if (!content.includes('SubtaskModalDialog')) {
  content = content.replace(
    'import { SubtaskCard } from "@/components/subtask-card";',
    'import { SubtaskCard } from "@/components/subtask-card";\nimport { SubtaskModalDialog } from "@/components/subtask-modal-dialog";'
  );
}

// 2. Add state
if (!content.includes('const [subtaskModalOpen, setSubtaskModalOpen]')) {
  content = content.replace(
    'const [addSubTaskModalOpen, setAddSubTaskModalOpen] = useState(false);',
    'const [addSubTaskModalOpen, setAddSubTaskModalOpen] = useState(false);\n  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);\n  const [subtaskModalTask, setSubtaskModalTask] = useState<any | null>(null);\n  const [subtaskModalEditingSub, setSubtaskModalEditingSub] = useState<any | null>(null);'
  );
}

// 3. Update handleOpenAddSubTaskModal
const addSubtaskHandlerPattern = /const handleOpenAddSubTaskModal = \(task: any\) => \{[\s\S]*?setAddSubTaskModalOpen\(true\);\s*\};/;
const newAddSubtaskHandler = `const handleOpenAddSubTaskModal = (task: any) => {
    setSubtaskModalTask(task);
    setSubtaskModalEditingSub(null);
    setSubtaskModalOpen(true);
  };`;
content = content.replace(addSubtaskHandlerPattern, newAddSubtaskHandler);

// 4. Update handleOpenEditSubtask
const editSubtaskHandlerPattern = /const handleOpenEditSubtask = \(task: any, sub: any\) => \{[\s\S]*?setEditSubtaskModalOpen\(true\);\s*\};/;
const newEditSubtaskHandler = `const handleOpenEditSubtask = (task: any, sub: any) => {
    setSubtaskModalTask(task);
    setSubtaskModalEditingSub(sub);
    setSubtaskModalOpen(true);
  };`;
content = content.replace(editSubtaskHandlerPattern, newEditSubtaskHandler);

// 5. Replace Dialog open={addSubTaskModalOpen} up to end of first edit dialog
const addDialogStart = '{/* Dedicated Add Sub-Task Dialog for Staff */}';
const editDialog1EndMarker = '{/* Sub-Task Upload Dialog (Images, Videos, PDF, Word, Excel) */}';

const addIdx = content.indexOf(addDialogStart);
const endMarkerIdx = content.indexOf(editDialog1EndMarker);

if (addIdx === -1 || endMarkerIdx === -1) {
  console.error('Boundaries not found!', { addIdx, endMarkerIdx });
  process.exit(1);
}

const replacementJsx = `{/* Unified Subtask Add & Edit Modal Dialog */}
      <SubtaskModalDialog
        open={subtaskModalOpen}
        onOpenChange={(open) => {
          setSubtaskModalOpen(open);
          if (!open) {
            setSubtaskModalEditingSub(null);
          }
        }}
        task={subtaskModalTask}
        editingSubtask={subtaskModalEditingSub}
        staffOptions={subtaskModalTask ? getProjectStaffOptions(subtaskModalTask) : []}
        isStaffViewer={false}
        onSaved={handleRefreshMyProfileTasks}
        onOpenHistory={(t, s) => {
          setHistoryModalSubtask(s || null);
          setHistoryModalTask(t);
        }}
      />\n\n          `;

content = content.slice(0, addIdx) + replacementJsx + content.slice(endMarkerIdx);

// 6. Remove remaining 3 duplicate edit dialogs
const dupPattern = /\{\/\* Edit Sub-Task Dialog \(from Three-Dots Action Menu\) \*\/\}[\s\S]*?<\/Dialog>/g;
content = content.replace(dupPattern, '');

fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', content, 'utf8');
console.log('Successfully updated my-profile-client.tsx with unified SubtaskModalDialog!');

