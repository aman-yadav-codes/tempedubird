const fs = require('fs');
const filePath = 'd:/edubird/app/admin/users/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
if (!content.includes('AffiliatesView')) {
  content = content.replace(
    `import { SalaryAccountDialog } from "./_components/salary-account-dialog"`,
    `import { SalaryAccountDialog } from "./_components/salary-account-dialog"\nimport { AffiliatesView } from "./_components/affiliates-view"\nimport { Share2, Users as UsersIcon } from "lucide-react"`
  );
}

// 2. Add activeMainTab state
if (!content.includes('activeMainTab')) {
  content = content.replace(
    `  const [users, setUsers] = useState<User[]>([])`,
    `  const [activeMainTab, setActiveMainTab] = useState<"users" | "affiliates">("users")\n  const [users, setUsers] = useState<User[]>([])`
  );
}

// 3. Update return JSX to include tab switcher and AffiliatesView
const targetHeader = `  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage platform users and their roles.</p>
        </div>
        <AddUserDialog
          roles={roles}
          accessToken={accessToken}
          onSaved={handleUserCreated}
        />
      </div>`;

const replacementHeader = `  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

if (content.includes(targetHeader)) {
  content = content.replace(targetHeader, replacementHeader);

  // Close the ternary before the Dialogs at bottom
  const targetEnd = `      <SalaryAccountDialog
        open={salaryAccountOpen}`;
  const replacementEnd = `      )}\n\n      <SalaryAccountDialog
        open={salaryAccountOpen}`;
  content = content.replace(targetEnd, replacementEnd);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('admin/users/page.tsx updated successfully');
