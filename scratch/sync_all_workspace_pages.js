const fs = require("fs");
const path = require("path");

const adminDir = path.join(__dirname, "..", "app", "admin");
const workspaceDir = path.join(__dirname, "..", "app", "workspace");

function scanDir(dir, base = "") {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanDir(fullPath, relPath));
    } else if (entry.name === "page.tsx") {
      results.push(base.replace(/\\/g, "/"));
    }
  }
  return results;
}

const adminPages = scanDir(adminDir);
console.log(`Found ${adminPages.length} pages in app/admin`);

let createdCount = 0;
for (const pageRel of adminPages) {
  // Skip platform-only or school-student-specific directories if not needed,
  // or create them so everything in workspace is 100% available
  const targetDir = path.join(workspaceDir, pageRel);
  const targetFile = path.join(targetDir, "page.tsx");

  if (!fs.existsSync(targetFile)) {
    fs.mkdirSync(targetDir, { recursive: true });
    const importPath = pageRel ? `@/app/admin/${pageRel}/page` : `@/app/admin/page`;
    fs.writeFileSync(targetFile, `export { default } from "${importPath}";\n`, "utf8");
    createdCount++;
  }
}

console.log(`Successfully created ${createdCount} missing workspace pages!`);

