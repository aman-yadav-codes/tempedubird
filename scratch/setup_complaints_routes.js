const fs = require("fs");
const path = require("path");

function ensureDirAndWrite(relPath, content) {
  const fullPath = path.join(__dirname, "..", relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, "utf8");
  console.log("Created:", relPath);
}

// 1. Complaints pages
ensureDirAndWrite(
  "app/admin/complaints/page.tsx",
  `export { default } from "@/app/admin/institution/complaints/page";\n`
);

ensureDirAndWrite(
  "app/workspace/complaints/page.tsx",
  `export { default } from "@/app/admin/institution/complaints/page";\n`
);

ensureDirAndWrite(
  "app/workspace/institution/complaints/page.tsx",
  `import { redirect } from "next/navigation";\n\nexport default function WorkspaceInstitutionComplaintsPage() {\n  redirect("/workspace/complaints");\n}\n`
);

// 2. Noticeboard pages
ensureDirAndWrite(
  "app/admin/noticeboard/page.tsx",
  `export { default } from "@/app/admin/institutions/news/page";\n`
);

ensureDirAndWrite(
  "app/workspace/noticeboard/page.tsx",
  `export { default } from "@/app/admin/institutions/news/page";\n`
);

// 3. Calendar pages
ensureDirAndWrite(
  "app/admin/calendar/page.tsx",
  `export { default } from "@/app/admin/master-data/institute-calendar/page";\n`
);

ensureDirAndWrite(
  "app/workspace/calendar/page.tsx",
  `export { default } from "@/app/admin/master-data/institute-calendar/page";\n`
);

console.log("Finished creating clean URL routes!");

