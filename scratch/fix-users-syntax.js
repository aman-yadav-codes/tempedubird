const fs = require('fs');
const filePath = 'd:/edubird/app/admin/users/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. Remove dangling ')}' before SalaryAccountDialog
content = content.replace(
  `      <UserPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        user={passwordUser}
        accessToken={accessToken}
      />

      )}

      <SalaryAccountDialog`,
  `      <UserPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        user={passwordUser}
        accessToken={accessToken}
      />

      <SalaryAccountDialog`
);

// 2. Add ')}' right after DataTable
content = content.replace(
  `                  )}
                </>
              )
            : undefined
        }
      />

      <UserProfileSheet`,
  `                  )}
                </>
              )
            : undefined
        }
      />
      )}

      <UserProfileSheet`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed users/page.tsx JSX syntax');
