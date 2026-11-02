const fs = require('fs');
let code = fs.readFileSync('components/admin-user-profile-menu.tsx', 'utf8');

code = code.replace(
  'const { user, setAuth, clearAuth } = useAuthStore();',
  `const pathname = usePathname();
  const { user, setAuth, clearAuth } = useAuthStore();`
);

code = code.replace(
  'if (!user) return null;',
  `const isClientRole =
    (user as any)?.role === "client" ||
    (user as any)?.primary_role === "client" ||
    user?.role_codes?.includes("client") ||
    user?.roles?.some((r: any) => String(r).toLowerCase() === "client") ||
    Boolean(pathname?.startsWith("/client"));

  if (!user) return null;`
);

const oldDropdown = `          <DropdownMenuGroup className="space-y-0.5">
            <DropdownMenuItem
              onClick={() => setSwitchAccountOpen(true)}
              className="cursor-pointer font-bold text-primary focus:text-primary focus:bg-primary/10"
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              <span className="flex-1 text-xs">All Switchable Accounts</span>
              <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary">Browse All</Badge>
            </DropdownMenuItem>
          </DropdownMenuGroup>`;

const newDropdown = `          {!isClientRole && (
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem
                onClick={() => setSwitchAccountOpen(true)}
                className="cursor-pointer font-bold text-primary focus:text-primary focus:bg-primary/10"
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                <span className="flex-1 text-xs">All Switchable Accounts</span>
                <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary">Browse All</Badge>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}`;

if (code.includes('All Switchable Accounts')) {
  code = code.replace(
    /<DropdownMenuGroup className="space-y-0\.5">[\s\S]*?<\/DropdownMenuGroup>/,
    `{!isClientRole && (
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem
                onClick={() => setSwitchAccountOpen(true)}
                className="cursor-pointer font-bold text-primary focus:text-primary focus:bg-primary/10"
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                <span className="flex-1 text-xs">All Switchable Accounts</span>
                <Badge variant="secondary" className="text-[9px] h-4 bg-primary/10 text-primary">Browse All</Badge>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}`
  );
}

fs.writeFileSync('components/admin-user-profile-menu.tsx', code, 'utf8');
console.log('Successfully patched admin-user-profile-menu.tsx');

