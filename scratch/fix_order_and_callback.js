const fs = require('fs');

// 1. Fix app/admin/my-profile/my-profile-client.tsx
let profileContent = fs.readFileSync('app/admin/my-profile/my-profile-client.tsx', 'utf8');
profileContent = profileContent.replace(
  'const getProjectStaffOptions = useCallback((task: any) => {',
  'const getProjectStaffOptions = (task: any) => {'
).replace('}, [user]);', '};');
fs.writeFileSync('app/admin/my-profile/my-profile-client.tsx', profileContent, 'utf8');
console.log('Fixed my-profile-client.tsx.');

// 2. Fix app/admin/operations/tasks/page.tsx
let pageContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// First remove getProjectStaffOptions from its lower position around line 1200
const staffOptionsRegex = /\/\/ Helper to extract ONLY employees and clients assigned to a project\/task\s*const getProjectStaffOptions = useCallback\([\s\S]*?\n  \}, \[user\]\);/;
pageContent = pageContent.replace(staffOptionsRegex, '');

// Now define getProjectStaffOptions above subtaskAssigneeOptions
const getProjectStaffOptionsDef = `// Helper to extract ONLY employees and clients assigned to a project/task
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
  }, [user]);

  // When a main task is created/assigned with specific members, only those members appear in subtasks`;

pageContent = pageContent.replace(
  '  // When a main task is created/assigned with specific members, only those members appear in subtasks',
  getProjectStaffOptionsDef
);

fs.writeFileSync('app/admin/operations/tasks/page.tsx', pageContent, 'utf8');
console.log('Fixed page.tsx ordering.');

