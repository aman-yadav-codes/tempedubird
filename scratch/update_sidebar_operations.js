const fs = require('fs');
let content = fs.readFileSync('components/app-sidebar.tsx', 'utf8');

const target = `            { title: "Task Management", url: "/admin/operations/tasks", icon: ClipboardList },
            { title: "Generate Documents", url: "/admin/generate", icon: Sparkles },`;

const replacement = `            { title: "Task Management", url: "/admin/operations/tasks", icon: ClipboardList },
            { title: "Project Types", url: "/admin/operations/project-types", icon: FolderKanban },
            { title: "Project Pipelines", url: "/admin/operations/project-pipelines", icon: GitFork },
            { title: "Generate Documents", url: "/admin/generate", icon: Sparkles },`;

const isCRLF = content.includes('\r\n');
if (isCRLF) {
  content = content.replace(/\r\n/g, '\n');
}

if (!content.includes(target)) {
  console.error("Target string not found in components/app-sidebar.tsx!");
  process.exit(1);
}

content = content.replace(target, replacement);

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync('components/app-sidebar.tsx', content, 'utf8');
console.log("Successfully updated components/app-sidebar.tsx with Project Types and Project Pipelines!");
