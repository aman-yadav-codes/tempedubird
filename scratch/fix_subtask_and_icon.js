const fs = require('fs');

let pageContent = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

// 1. Add FileText to lucide-react imports
if (!pageContent.includes('FileText,')) {
  pageContent = pageContent.replace('FileCheck,', 'FileCheck,\n  FileText,');
}

// 2. Add uploads and work_updates to SubTask
const oldSubTask = `  urgency: "low" | "medium" | "high" | "urgent";
  status: TaskStatus;
  notes?: string | null;
};`;

const newSubTask = `  urgency: "low" | "medium" | "high" | "urgent";
  status: TaskStatus;
  notes?: string | null;
  uploads?: any[];
  work_updates?: any[];
};`;

if (pageContent.includes(oldSubTask)) {
  pageContent = pageContent.replace(oldSubTask, newSubTask);
  console.log('Added uploads and work_updates to SubTask');
} else {
  console.log('oldSubTask not found');
}

fs.writeFileSync('app/admin/operations/tasks/page.tsx', pageContent, 'utf8');
console.log('Successfully updated page.tsx');

