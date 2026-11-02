const fs = require('fs');

// 1. Update app/admin/operations/tasks/page.tsx
let pageContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const oldPageStaffOptionsRegex = /\/\/ Helper to extract all employees assigned to a project\/task\s*const getProjectStaffOptions = \(task: any\) => \{[\s\S]*?return Array\.from\(optionsMap\.values\(\)\);\s*\};/;

const newPageStaffOptions = `// Helper to extract ONLY employees and clients assigned to a project/task
  const getProjectStaffOptions = useCallback((task: any) => {
    if (!task) return [];
    const optionsMap = new Map<string, { id: any; name: string; role?: string }>();

    // 1. Staff: Project assigned employees array
    if (Array.isArray(task.assigned_employees) && task.assigned_employees.length > 0) {
      task.assigned_employees.forEach((emp: any) => {
        if (emp?.id) {
          optionsMap.set(String(emp.id), {
            id: emp.id,
            name: emp.name || emp.full_name || \`Employee #\${emp.id}\`,
            role: emp.role || "Staff Member",
          });
        }
      });
    }

    // 2. Staff: Project primary assigned employee
    if (task.assigned_employee_id) {
      optionsMap.set(String(task.assigned_employee_id), {
        id: task.assigned_employee_id,
        name: task.assigned_employee_name || "Assigned Staff",
        role: task.assigned_employee_role || "Staff Member",
      });
    }

    // 3. Staff: Project Leader
    if (task.project_leader_id) {
      if (!optionsMap.has(String(task.project_leader_id))) {
        optionsMap.set(String(task.project_leader_id), {
          id: task.project_leader_id,
          name: task.project_leader_name || "Project Leader",
          role: "Project Leader",
        });
      }
    }

    // 4. Clients: Project assigned clients array
    if (Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0) {
      task.assigned_clients.forEach((c: any) => {
        const cId = c?.user_id || c?.id;
        if (cId) {
          optionsMap.set(String(cId), {
            id: cId,
            name: c.company_name || c.name || \`Client #\${c.id}\`,
            role: c.client_type ? \`\${c.client_type} (Client)\` : "Client",
          });
        }
      });
    }

    // 5. Clients: Project primary client
    if (task.client_id && task.client_name && task.client_name !== "EduBird") {
      if (!optionsMap.has(String(task.client_id))) {
        optionsMap.set(String(task.client_id), {
          id: task.client_id,
          name: task.client_name,
          role: "Client",
        });
      }
    }

    // 6. Fallback only if project has NO assigned members or clients at all
    if (optionsMap.size === 0) {
      if (user?.id) {
        optionsMap.set(String(user.id), {
          id: user.id,
          name: user.full_name || (user as any)?.name || user.email || "You",
          role: (user as any)?.role || "Staff Member",
        });
      }
    }

    return Array.from(optionsMap.values());
  }, [user]);`;

if (oldPageStaffOptionsRegex.test(pageContent)) {
  pageContent = pageContent.replace(oldPageStaffOptionsRegex, newPageStaffOptions);
  console.log('Updated getProjectStaffOptions in page.tsx.');
} else {
  console.error('Could not match getProjectStaffOptions in page.tsx.');
}

// Also update subtaskAssigneeOptions in page.tsx
const oldSubtaskAssigneeOptionsRegex = /const subtaskAssigneeOptions = useMemo\(\(\) => \{[\s\S]*?return uniqueModalStaffList;\s*\}, \[selectedTaskForSubtasks, uniqueModalStaffList\]\);/;

const newSubtaskAssigneeOptions = `const subtaskAssigneeOptions = useMemo(() => {
    if (!selectedTaskForSubtasks) return uniqueModalStaffList;
    const opts = getProjectStaffOptions(selectedTaskForSubtasks);
    return opts.length > 0 ? opts : uniqueModalStaffList;
  }, [selectedTaskForSubtasks, uniqueModalStaffList, getProjectStaffOptions]);`;

if (oldSubtaskAssigneeOptionsRegex.test(pageContent)) {
  pageContent = pageContent.replace(oldSubtaskAssigneeOptionsRegex, newSubtaskAssigneeOptions);
  console.log('Updated subtaskAssigneeOptions in page.tsx.');
} else {
  console.log('subtaskAssigneeOptions not matched with regex.');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', pageContent, 'utf8');

// 2. Update components/subtask-card.tsx
let cardContent = fs.readFileSync('components/subtask-card.tsx', 'utf8');

const oldCardStaffOptionsRegex = /\/\/ Fallback staff list if task\.assigned_employees exist\s*const effectiveStaffOptions: Array<\{ id: number \| string; name: string; role\?: string \| null \}> = \[\];[\s\S]*?if \(\s*subtask\.assigned_employee_id &&[\s\S]*?role: subtask\.assigned_employee_role \|\| null,\s*\}\);\s*\}/;

const newCardStaffOptions = `// Effective staff & client options strictly assigned to this project
  const effectiveStaffOptions: Array<{ id: number | string; name: string; role?: string | null }> = [];
  if (staffOptions && staffOptions.length > 0) {
    effectiveStaffOptions.push(...staffOptions);
  } else {
    // Fallback: extract directly from project assigned employees and clients
    if (Array.isArray(task.assigned_employees)) {
      task.assigned_employees.forEach((e: any) => {
        if (e && e.id && !effectiveStaffOptions.some((s) => String(s.id) === String(e.id))) {
          effectiveStaffOptions.push({ id: e.id, name: e.name || "Staff", role: e.role || null });
        }
      });
    }
    if (task.assigned_employee_id && !effectiveStaffOptions.some((s) => String(s.id) === String(task.assigned_employee_id))) {
      effectiveStaffOptions.push({
        id: task.assigned_employee_id,
        name: task.assigned_employee_name || "Staff",
        role: task.assigned_employee_role || null,
      });
    }
    if (task.project_leader_id && !effectiveStaffOptions.some((s) => String(s.id) === String(task.project_leader_id))) {
      effectiveStaffOptions.push({
        id: task.project_leader_id,
        name: task.project_leader_name || "Project Leader",
        role: "Project Leader",
      });
    }
    if (Array.isArray(task.assigned_clients)) {
      task.assigned_clients.forEach((c: any) => {
        const cId = c.user_id || c.id;
        if (cId && !effectiveStaffOptions.some((s) => String(s.id) === String(cId))) {
          effectiveStaffOptions.push({
            id: cId,
            name: c.company_name || c.name || "Client",
            role: "Client",
          });
        }
      });
    }
    if (task.client_id && task.client_name && task.client_name !== "EduBird" && !effectiveStaffOptions.some((s) => String(s.id) === String(task.client_id))) {
      effectiveStaffOptions.push({
        id: task.client_id,
        name: task.client_name,
        role: "Client",
      });
    }
  }

  // Ensure current subtask assignee is preserved in options
  if (
    subtask.assigned_employee_id &&
    !effectiveStaffOptions.some((s) => String(s.id) === String(subtask.assigned_employee_id))
  ) {
    effectiveStaffOptions.push({
      id: subtask.assigned_employee_id,
      name: subtask.assigned_employee_name || "Assigned Member",
      role: subtask.assigned_employee_role || null,
    });
  }`;

if (oldCardStaffOptionsRegex.test(cardContent)) {
  cardContent = cardContent.replace(oldCardStaffOptionsRegex, newCardStaffOptions);
  console.log('Updated effectiveStaffOptions in subtask-card.tsx.');
} else {
  console.error('Could not match oldCardStaffOptionsRegex in subtask-card.tsx.');
}

fs.writeFileSync('components/subtask-card.tsx', cardContent, 'utf8');

// 3. Update components/subtask-modal-dialog.tsx
let dialogContent = fs.readFileSync('components/subtask-modal-dialog.tsx', 'utf8');

const oldDialogOptionsRegex = /const effectiveStaffOptions = useMemo\(\(\) => \{[\s\S]*?return list;\s*\}, \[staffOptions, task, editingSubtask\]\);/;

const newDialogOptions = `const effectiveStaffOptions = useMemo(() => {
    const list: Array<{ id: number | string; name: string; role?: string | null }> = [];

    const addToList = (id: any, name: string, role?: string | null) => {
      if (!id) return;
      if (!list.some((s) => String(s.id) === String(id))) {
        list.push({ id, name: name || "Staff", role: role || null });
      }
    };

    if (staffOptions && staffOptions.length > 0) {
      staffOptions.forEach((s) => addToList(s.id, s.name, s.role));
    } else {
      // Pull only members and clients assigned to this project
      if (Array.isArray(task?.assigned_employees)) {
        task.assigned_employees.forEach((e: any) => {
          if (e && e.id) addToList(e.id, e.name || "Staff", e.role || null);
        });
      }
      if (task?.assigned_employee_id) {
        addToList(task.assigned_employee_id, task.assigned_employee_name || "Staff", task.assigned_employee_role || null);
      }
      if (task?.project_leader_id) {
        addToList(task.project_leader_id, task.project_leader_name || "Project Leader", "Project Leader");
      }
      if (Array.isArray(task?.assigned_clients)) {
        task.assigned_clients.forEach((c: any) => {
          const cId = c.user_id || c.id;
          if (cId) addToList(cId, c.company_name || c.name || "Client", "Client");
        });
      }
      if (task?.client_id && task?.client_name && task?.client_name !== "EduBird") {
        addToList(task.client_id, task.client_name, "Client");
      }
    }

    if (editingSubtask?.assigned_employee_id) {
      addToList(
        editingSubtask.assigned_employee_id,
        editingSubtask.assigned_employee_name || "Staff Member",
        editingSubtask.assigned_employee_role || null
      );
    }

    return list;
  }, [staffOptions, task, editingSubtask]);`;

if (oldDialogOptionsRegex.test(dialogContent)) {
  dialogContent = dialogContent.replace(oldDialogOptionsRegex, newDialogOptions);
  console.log('Updated effectiveStaffOptions in subtask-modal-dialog.tsx.');
} else {
  console.error('Could not match oldDialogOptionsRegex in subtask-modal-dialog.tsx.');
}

fs.writeFileSync('components/subtask-modal-dialog.tsx', dialogContent, 'utf8');

// 4. Update app/admin/my-profile/my-profile-client.tsx
let profileContent = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8');

const oldProfileOptionsRegex = /\/\/ Helper to extract all employees assigned to a project\/task\s*const getProjectStaffOptions = \(task: any\) => \{[\s\S]*?return Array\.from\(optionsMap\.values\(\)\);\s*\};/;

const newProfileOptions = `// Helper to extract ONLY employees and clients assigned to a project/task
  const getProjectStaffOptions = useCallback((task: any) => {
    if (!task) return [];
    const optionsMap = new Map<string, { id: any; name: string; role?: string }>();

    // 1. Staff: Project assigned employees array
    if (Array.isArray(task.assigned_employees) && task.assigned_employees.length > 0) {
      task.assigned_employees.forEach((emp: any) => {
        if (emp?.id) {
          optionsMap.set(String(emp.id), {
            id: emp.id,
            name: emp.name || emp.full_name || \`Employee #\${emp.id}\`,
            role: emp.role || "Staff Member",
          });
        }
      });
    }

    // 2. Staff: Project primary assigned employee
    if (task.assigned_employee_id) {
      optionsMap.set(String(task.assigned_employee_id), {
        id: task.assigned_employee_id,
        name: task.assigned_employee_name || "Assigned Staff",
        role: task.assigned_employee_role || "Staff Member",
      });
    }

    // 3. Staff: Project Leader
    if (task.project_leader_id) {
      if (!optionsMap.has(String(task.project_leader_id))) {
        optionsMap.set(String(task.project_leader_id), {
          id: task.project_leader_id,
          name: task.project_leader_name || "Project Leader",
          role: "Project Leader",
        });
      }
    }

    // 4. Clients: Project assigned clients array
    if (Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0) {
      task.assigned_clients.forEach((c: any) => {
        const cId = c?.user_id || c?.id;
        if (cId) {
          optionsMap.set(String(cId), {
            id: cId,
            name: c.company_name || c.name || \`Client #\${c.id}\`,
            role: c.client_type ? \`\${c.client_type} (Client)\` : "Client",
          });
        }
      });
    }

    // 5. Clients: Project primary client
    if (task.client_id && task.client_name && task.client_name !== "EduBird") {
      if (!optionsMap.has(String(task.client_id))) {
        optionsMap.set(String(task.client_id), {
          id: task.client_id,
          name: task.client_name,
          role: "Client",
        });
      }
    }

    // 6. Fallback only if project has NO assigned members or clients at all
    if (optionsMap.size === 0) {
      if (user?.id) {
        optionsMap.set(String(user.id), {
          id: user.id,
          name: user.full_name || (user as any)?.name || user.email || "You",
          role: (user as any)?.role || "Staff Member",
        });
      }
    }

    return Array.from(optionsMap.values());
  }, [user]);`;

if (oldProfileOptionsRegex.test(profileContent)) {
  profileContent = profileContent.replace(oldProfileOptionsRegex, newProfileOptions);
  console.log('Updated getProjectStaffOptions in my-profile-client.tsx.');
} else {
  console.error('Could not match oldProfileOptionsRegex in my-profile-client.tsx.');
}

fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', profileContent, 'utf8');

console.log('All files updated successfully!');

