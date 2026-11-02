const fs = require('fs');

let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const oldHistBlock = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => !open && setHistoryModalTask(null)}
        task={historyModalTask}
      />`;

const newHistBlock = `      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        open={Boolean(historyModalTask)}
        filterSubtaskId={subtaskHistoryFilter.subtaskId}
        filterSubtaskTitle={subtaskHistoryFilter.subtaskTitle}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryModalTask(null);
            setSubtaskHistoryFilter({});
          }
        }}
        task={historyModalTask}
      />

      {/* Sub-Task Upload Dialog (PDF, Word, Images with uploader access control) */}
      <SubTaskUploadDialog
        open={Boolean(uploadModalState)}
        onOpenChange={(open) => !open && setUploadModalState(null)}
        task={uploadModalState?.task || null}
        subtask={uploadModalState?.subtask || null}
        onSaved={fetchTasks}
      />

      {/* Sub-Task Work Update Dialog (Post work updates with attachments & timestamps) */}
      <SubTaskWorkUpdateDialog
        open={Boolean(workUpdateModalState)}
        onOpenChange={(open) => !open && setWorkUpdateModalState(null)}
        task={workUpdateModalState?.task || null}
        subtask={workUpdateModalState?.subtask || null}
        onSaved={fetchTasks}
      />`;

if (code.includes(oldHistBlock)) {
  code = code.replace(oldHistBlock, newHistBlock);
  console.log('Mounted subtask dialogs');
} else if (code.includes(oldHistBlock.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldHistBlock.replace(/\n/g, '\r\n'), newHistBlock.replace(/\n/g, '\r\n'));
  console.log('Mounted subtask dialogs (CRLF)');
} else {
  console.error('oldHistBlock not found!');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');

