const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "lib", "auth", "role-routes.ts");
let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

const instIdx = lines.findIndex(l => l.includes('institution_admin: "instituteadmin"'));
if (instIdx !== -1) {
  lines.splice(
    instIdx,
    7,
    '  institution_admin: "workspace",',
    '  business_owner: "workspace",',
    '  professional_provider: "workspace",',
    '  professional_organization: "workspace",',
    '  school_owner: "workspace",',
    '  college_owner: "workspace",',
    '  university_owner: "workspace",',
    '  library_owner: "workspace",',
    '  pg_owner: "workspace",'
  );
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  console.log("Updated ROLE_PREFIX_MAP successfully!");
} else {
  console.log("Could not find institution_admin in lines");
}

