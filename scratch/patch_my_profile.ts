import fs from 'fs';

const filePath = 'app/admin/my-profile/my-profile-client.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. In handleUpdateTaskStatus
const target1 = `          fetch(\`/api/admin/staff/attendance?mode=self&month=\${selectedMonth}\${instQuery}\`, {
            headers: accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {}
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setAttendanceData(d); })
            .catch(() => {});
        }
        toast.success(\`Task moved to \${newStatus.replace("_", " ")}\`);`;

const replacement1 = `          fetch(\`/api/admin/staff/attendance?mode=self&month=\${selectedMonth}\${instQuery}\`, {
            headers: accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {}
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setAttendanceData(d); })
            .catch(() => {});
        }
        window.dispatchEvent(new CustomEvent("task-status-updated", { detail: { taskId, status: newStatus } }));
        toast.success(\`Task moved to \${newStatus.replace("_", " ")}\`);`;

// 2. In handleSubtaskStatusUpdate
const target2 = `        if (newStatus === "under_review") {
          toast.success("Subtask marked as Under Review (moved to Under Review tab)");
        } else {
          toast.success(\`Subtask marked as \${newStatus.replace("_", " ")}\`);
        }`;

const replacement2 = `        window.dispatchEvent(new CustomEvent("task-status-updated", { detail: { taskId: task.id, subtaskId: subId, status: newStatus } }));
        if (newStatus === "under_review") {
          toast.success("Subtask marked as Under Review (moved to Under Review tab)");
        } else {
          toast.success(\`Subtask marked as \${newStatus.replace("_", " ")}\`);
        }`;

// 3. In handleStopCurrentTask
const target3 = `    setTasks(updatedTasks);
    setTaskStatusTab("pending");
    const instQuery = activeInstitutionId ? \`&institution_id=\${activeInstitutionId}\` : "";
    fetch(\`/api/admin/staff/attendance?mode=self&month=\${selectedMonth}\${instQuery}\`, {
      headers: accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {}
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAttendanceData(d); })
      .catch(() => {});
    toast.success("Active task stopped and moved back to Pending.");`;

const replacement3 = `    setTasks(updatedTasks);
    setTaskStatusTab("pending");
    const instQuery = activeInstitutionId ? \`&institution_id=\${activeInstitutionId}\` : "";
    fetch(\`/api/admin/staff/attendance?mode=self&month=\${selectedMonth}\${instQuery}\`, {
      headers: accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {}
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAttendanceData(d); })
      .catch(() => {});
    window.dispatchEvent(new CustomEvent("task-status-updated", { detail: { action: "stop_all" } }));
    toast.success("Active task stopped and moved back to Pending.");`;

// 4. In useEffect for loadData
const target4 = `  useEffect(() => {
    loadData();
  }, [accessToken, activeInstitutionId, selectedMonth]);`;

const replacement4 = `  useEffect(() => {
    loadData();
  }, [accessToken, activeInstitutionId, selectedMonth]);

  useEffect(() => {
    const handleTaskUpdated = () => {
      loadData();
    };
    window.addEventListener("task-status-updated", handleTaskUpdated);
    return () => window.removeEventListener("task-status-updated", handleTaskUpdated);
  }, []);`;

// Normalize CRLF
let normContent = content.replace(/\r\n/g, '\n');
const normT1 = target1.replace(/\r\n/g, '\n');
const normR1 = replacement1.replace(/\r\n/g, '\n');
const normT2 = target2.replace(/\r\n/g, '\n');
const normR2 = replacement2.replace(/\r\n/g, '\n');
const normT3 = target3.replace(/\r\n/g, '\n');
const normR3 = replacement3.replace(/\r\n/g, '\n');
const normT4 = target4.replace(/\r\n/g, '\n');
const normR4 = replacement4.replace(/\r\n/g, '\n');

if (normContent.includes(normT1)) {
  normContent = normContent.replace(normT1, normR1);
  console.log('1 replaced');
}
if (normContent.includes(normT2)) {
  normContent = normContent.replace(normT2, normR2);
  console.log('2 replaced');
}
if (normContent.includes(normT3)) {
  normContent = normContent.replace(normT3, normR3);
  console.log('3 replaced');
}
if (normContent.includes(normT4)) {
  normContent = normContent.replace(normT4, normR4);
  console.log('4 replaced');
}

const finalContent = content.includes('\r\n') ? normContent.replace(/\n/g, '\r\n') : normContent;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Finished updating my-profile-client.tsx');
