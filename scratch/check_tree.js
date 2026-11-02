const fs = require("fs");
const path = require("path");
const filePath = path.join(__dirname, "../app/admin/operations/tasks/page.tsx");
const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);

console.log("=== 2480-2520 ===");
for (let i = 2480; i <= 2520; i++) {
  console.log(`${i}: ${lines[i]}`);
}

console.log("=== 2570-2615 ===");
for (let i = 2570; i <= 2615; i++) {
  console.log(`${i}: ${lines[i]}`);
}

