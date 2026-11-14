const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "app", "workspace");

const routes = [
  "",
  "dashboard",
  "finance",
  "finance/[section]",
  "transactions",
  "marketing",
  "marketing/products",
  "marketing/offers",
  "marketing/coupons",
  "marketing/seo",
  "sales",
  "sales/clients",
  "sales/enquiries",
  "sales/leads",
  "operations",
  "operations/tasks",
  "operations/penalty-rules",
  "orders",
  "profiles",
  "reviews",
  "staff",
  "staff/documents",
  "staff/my-data",
  "staff/performance",
  "team",
  "inventory",
  "settings",
  "generate",
  "affiliate",
  "my-profile",
  "account",
  "vendors",
  "categories",
  "catalog",
  "locations",
  "institutions",
  "institutions/list",
];

if (!fs.existsSync(root)) {
  fs.mkdirSync(root, { recursive: true });
}

// Layout
fs.writeFileSync(
  path.join(root, "layout.tsx"),
  `export { default } from "@/app/admin/layout";\n`,
  "utf8"
);

for (const route of routes) {
  const dir = path.join(root, route);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const exportPath = route === "" ? "@/app/admin/page" : `@/app/admin/${route}/page`;
  const fileContent = `export { default } from "${exportPath}";\n`;
  fs.writeFileSync(path.join(dir, "page.tsx"), fileContent, "utf8");
}

console.log("Created all workspace routes successfully!");

