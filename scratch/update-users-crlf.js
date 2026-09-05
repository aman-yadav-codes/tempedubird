const fs = require('fs');
const filePath = 'd:/edubird/app/admin/users/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Imports
if (!content.includes('AffiliatesView')) {
  content = `import { AffiliatesView } from "./_components/affiliates-view";\nimport { Share2, Users as UsersIcon } from "lucide-react";\n` + content;
}

// 2. State
if (!content.includes('const [activeMainTab, setActiveMainTab]')) {
  content = content.replace(
    'const [users, setUsers] = useState<User[]>([])',
    'const [activeMainTab, setActiveMainTab] = useState<"users" | "affiliates">("users");\n  const [users, setUsers] = useState<User[]>([])'
  );
}

// 3. Header replacement
const headerRegex = /<div className="flex items-center justify-between">\s*<div>\s*<h1 className="text-2xl font-bold tracking-tight">Users<\/h1>\s*<p className="text-muted-foreground">Manage platform users and their roles\.<\/p>\s*<\/div>\s*<AddUserDialog[\s\S]*?\/>\s*<\/div>/;

const newHeader = `<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Affiliates</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Manage platform users, roles, and affiliate referral network.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMainTab("users")}
              className={\`rounded-lg text-xs font-bold gap-1.5 cursor-pointer h-8 px-3 \${
                activeMainTab === "users"
                  ? "bg-white text-slate-900 shadow-xs hover:bg-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }\`}
            >
              <UsersIcon className="h-3.5 w-3.5" />
              All Users
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveMainTab("affiliates")}
              className={\`rounded-lg text-xs font-bold gap-1.5 cursor-pointer h-8 px-3 \${
                activeMainTab === "affiliates"
                  ? "bg-white text-slate-900 shadow-xs hover:bg-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }\`}
            >
              <Share2 className="h-3.5 w-3.5 text-[#D91B1B]" />
              Affiliates
            </Button>
          </div>
          {activeMainTab === "users" && (
            <AddUserDialog
              roles={roles}
              accessToken={accessToken}
              onSaved={handleUserCreated}
            />
          )}
        </div>
      </div>

      {activeMainTab === "affiliates" ? (
        <AffiliatesView />
      ) : (`
;

if (headerRegex.test(content)) {
  content = content.replace(headerRegex, newHeader);
  // Also close the ternary right before <SalaryAccountDialog
  content = content.replace(
    '<SalaryAccountDialog',
    ')}\n\n      <SalaryAccountDialog'
  );
  console.log('Successfully updated admin/users/page.tsx with Affiliates tab');
} else {
  console.log('Header regex did not match in admin/users/page.tsx');
}

fs.writeFileSync(filePath, content, 'utf8');
