const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "components", "app-sidebar.tsx");
let content = fs.readFileSync(filePath, "utf8");

// Replace complaints URL
content = content.replaceAll(
  `"/admin/institution/complaints"`,
  `"/admin/complaints"`
);

// Replace news / noticeboard URL
content = content.replaceAll(
  `"/admin/institutions/news"`,
  `"/admin/noticeboard"`
);

// Replace calendar URL in admin group
content = content.replace(
  `{ title: "Business Calendar", url: "/admin/master-data/institute-calendar", icon: CalendarDays },`,
  `{ title: "Business Calendar", url: "/admin/calendar", icon: CalendarDays },`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Updated app-sidebar.tsx with clean URLs!");

