const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').replace(/\r\n/g, '\n');

const oldCardClient = `                  {/* Client (if not institution admin) */}
                  {!isInstitutionAdmin && task.client_name && (
                    <div className="flex items-center gap-2 text-xs pt-1">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-bold text-foreground">{task.client_name}</span>
                    </div>
                  )}`;

const newCardClient = `                  {/* Assigned Clients Badges */}
                  {(Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0) || task.client_name ? (
                    <div className="flex items-center gap-1.5 text-xs pt-1 flex-wrap">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground text-[11px] font-medium">Client:</span>
                      {Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0 ? (
                        task.assigned_clients.map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-[11px] py-0 px-2 font-semibold gap-1">
                            <Building2 className="w-2.5 h-2.5 text-primary" />
                            {c.company_name || c.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="font-bold text-foreground text-xs">{task.client_name}</span>
                      )}
                    </div>
                  ) : null}`;

if (code.includes(oldCardClient)) {
  code = code.replace(oldCardClient, newCardClient);
  fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
  console.log('Successfully updated card client display in page.tsx');
} else {
  console.log('oldCardClient not found in page.tsx');
}

