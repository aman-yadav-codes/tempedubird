const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "admin", "institutions", "page.tsx");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
  `<h1 className="text-2xl font-bold tracking-tight">Institutions</h1>`,
  `<h1 className="text-2xl font-bold tracking-tight">Businesses & Professionals</h1>`
);
content = content.replace(
  `<p className="text-sm text-muted-foreground">Manage organization profiles, contact info, subtypes and media.</p>`,
  `<p className="text-sm text-muted-foreground">Manage business & professional directory, contact info, categories, and profiles.</p>`
);
content = content.replace(
  `<Plus className="mr-2 h-4 w-4" /> New Institution`,
  `<Plus className="mr-2 h-4 w-4" /> New Business / Profile`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated app/admin/institutions/page.tsx");

