const fs = require('fs');

// 1. Update permissions.ts
const permPath = 'd:/edubird/lib/auth/permissions.ts';
let permContent = fs.readFileSync(permPath, 'utf8');

if (!permContent.includes('key: "affiliate"')) {
  permContent = permContent.replace(
    `  { key: "users.allusers", label: "All Users", description: "admin users", scope: "platform", page: "/admin/users" },`,
    `  { key: "users.allusers", label: "All Users", description: "admin users", scope: "platform", page: "/admin/users" },\n  { key: "affiliate", label: "Affiliate", description: "affiliate program, referrals and earnings", scope: "institution", page: "/admin/affiliate" },`
  );
}

if (!permContent.includes('normalized === "/admin/affiliate"')) {
  permContent = permContent.replace(
    `export function isAdminPathVisibleForRole(`,
    `export function isAdminPathVisibleForRole(`
  );
  // Add affiliate bypass at start of isAdminPathVisibleForRole
  const roleCheckTarget = `  const normalized = normalizeAdminPath(pathname);`;
  const roleCheckReplacement = `  const normalized = normalizeAdminPath(pathname);\n  if (normalized === "/admin/affiliate" || normalized.startsWith("/admin/affiliate")) return true;`;
  permContent = permContent.replace(roleCheckTarget, roleCheckReplacement);
}

fs.writeFileSync(permPath, permContent, 'utf8');
console.log('permissions.ts updated successfully');

// 2. Update app-sidebar.tsx
const sidebarPath = 'd:/edubird/components/app-sidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

// Ensure Gift is imported if not present
if (!sidebarContent.includes('Gift,')) {
  sidebarContent = sidebarContent.replace(
    `import {`,
    `import {\n    Gift,`
  );
}

// Add Affiliate nav item
if (!sidebarContent.includes('url: "/admin/affiliate"')) {
  const userTarget = `    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        children: [
            { title: "All Users", url: "/admin/users", icon: UsersRound },
        ],
    },`;
  const userReplacement = `    {
        title: "Users",
        url: "/admin/users",
        icon: Users,
        children: [
            { title: "All Users", url: "/admin/users", icon: UsersRound },
        ],
    },
    {
        title: "Affiliate",
        url: "/admin/affiliate",
        icon: Gift,
    },`;
  sidebarContent = sidebarContent.replace(userTarget, userReplacement);
}

fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
console.log('app-sidebar.tsx updated successfully');
