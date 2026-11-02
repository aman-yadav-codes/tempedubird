const fs = require('fs');
let content = fs.readFileSync('components/app-sidebar.tsx', 'utf8');

// Add icons
if (!content.includes('FolderKanban,') || !content.includes('GitFork,')) {
  content = content.replace(
    '    FolderTree,\n',
    '    FolderTree,\n    FolderKanban,\n    GitFork,\n'
  );
  if (!content.includes('FolderKanban,')) {
    content = content.replace(
      '    FolderTree,\r\n',
      '    FolderTree,\r\n    FolderKanban,\r\n    GitFork,\r\n'
    );
  }
}

// Add Project Types and Project Pipelines to Operations children
const oldOpsBlock = `        children: [
            { title: "Task Management", url: "/admin/operations/tasks", icon: ClipboardList },
            { title: "Generate Documents", url: "/admin/generate", icon: Sparkles },
            { title: "Penalty Rules", url: "/admin/operations/penalty-rules", icon: AlertTriangle },
        ],`;

const newOpsBlock = `        children: [
            { title: "Task Management", url: "/admin/operations/tasks", icon: ClipboardList },
            { title: "Project Types", url: "/admin/operations/project-types", icon: FolderKanban },
            { title: "Project Pipelines", url: "/admin/operations/project-pipelines", icon: GitFork },
            { title: "Generate Documents", url: "/admin/generate", icon: Sparkles },
            { title: "Penalty Rules", url: "/admin/operations/penalty-rules", icon: AlertTriangle },
        ],`;

content = content.replace(oldOpsBlock, newOpsBlock);
content = content.replace(oldOpsBlock.replace(/\r\n/g, '\n'), newOpsBlock);

fs.writeFileSync('components/app-sidebar.tsx', content, 'utf8');
console.log('Updated components/app-sidebar.tsx Operations children');

