const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "lib", "auth", "role-routes.ts");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(
  `  "company",`,
  `  "calendar",\n  "company",\n  "complaints",`
);

content = content.replace(
  `  "notifications",`,
  `  "noticeboard",\n  "notifications",`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated role-routes.ts with complaints, noticeboard, calendar");

