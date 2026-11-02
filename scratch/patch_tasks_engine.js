const fs = require('fs');

let code = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');
const isCRLF = code.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

if (!code.includes('recordPerformancePoints')) {
  code = `import { recordPerformancePoints } from "@/lib/performance/performance-engine";` + nl + code;

  const target = `const createdTask = res.rows[0];` + nl + nl + `    // Auto-sync staff attendance working hours, check-in count, checkout, and task hours`;
  const injection = `const createdTask = res.rows[0];

    // Award project creation performance points (10% of project amount)
    if (user?.id && createdTask?.id) {
      const projAmount = Number(createdTask.price || createdTask.cost || finalPrice || costVal || 0);
      void recordPerformancePoints({
        employeeId: user.id,
        activityType: "project_created",
        referenceModule: "operations_project",
        referenceRecordId: createdTask.id,
        originalAmount: projAmount,
        performedBy: { id: user.id, name: (user as any)?.full_name || (user as any)?.name },
        customDescription: "Created Project: " + (createdTask.title || "Untitled") + " (10% of ₹" + projAmount.toLocaleString("en-IN") + ")",
        institutionId: syncInstId || undefined,
      }).catch((e) => console.warn("[Project Created] performance points error:", e));
    }

    // Auto-sync staff attendance working hours, check-in count, checkout, and task hours`;

  const targetNorm = target.replace(/\r\n/g, '\n');
  const codeNorm = code.replace(/\r\n/g, '\n');

  if (codeNorm.includes(targetNorm)) {
    const patched = codeNorm.replace(targetNorm, injection.replace(/\r\n/g, '\n'));
    fs.writeFileSync('app/api/admin/operations/tasks/route.ts', isCRLF ? patched.replace(/\n/g, '\r\n') : patched, 'utf8');
    console.log('Successfully patched operations/tasks/route.ts!');
  } else {
    console.error('Target not found in tasks route!');
  }
}

