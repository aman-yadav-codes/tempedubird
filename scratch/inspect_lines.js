const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
for (let i = 3050; i <= 3085; i++) {
  console.log(`${i}: ${JSON.stringify(lines[i])}`);
}

