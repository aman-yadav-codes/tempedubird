const fs = require('fs');

let lines = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('formProjectFor === "own_company" ?'));
let endIdx = -1;
for (let i = startIdx; i < startIdx + 150; i++) {
  if (lines[i].includes('{/* Timeline: Start Date and Due Date */}')) {
    endIdx = i;
    break;
  }
}

console.log('Replacing from line', startIdx, 'to', endIdx);

const replacement = `                {formProjectFor === "own_company" ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>This project will be assigned for internal company: <strong>EduBird</strong></span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Client Name (From Sales Client Section) <span className="text-destructive">*</span>
                        {formAssignedClientIds.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                            {formAssignedClientIds.length} Selected
                          </Badge>
                        )}
                      </Label>
                      <div className="flex items-center gap-2">
                        <a
                          href={addClientUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-0.5 rounded-full"
                          title="Open clients directory to add a new client record"
                        >
                          <Plus className="w-3 h-3" /> Add Client
                        </a>
                        {formAssignedClientIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormAssignedClientIds([]);
                              setFormClientId("none");
                              setFormClientName("");
                              setClientSearchQuery("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Searchable Multi-Client Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!clientDropdownOpen && clients.length === 0) {
                            void fetchClientsForModal();
                          }
                          setClientDropdownOpen(!clientDropdownOpen);
                        }}
                        className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className={\`truncate text-left \${formAssignedClientIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}\`}>
                            {formAssignedClientIds.length === 0
                              ? "-- Select Client Accounts (Searchable) --"
                              : formAssignedClientIds.length === 1
                              ? (() => {
                                  const c = clients.find((cl) => String(cl.id) === formAssignedClientIds[0]);
                                  return c ? \`\${c.company_name || c.name} (\${c.client_type || "Client"})\` : (formClientName || "1 client selected");
                                })()
                              : \`\${formAssignedClientIds.length} clients selected\`}
                          </span>
                        </span>
                        <ChevronDown className={\`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 \${clientDropdownOpen ? "rotate-180" : ""}\`} />
                      </button>

                      {clientDropdownOpen && (
                        <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                              value={clientSearchQuery}
                              onChange={(e) => setClientSearchQuery(e.target.value)}
                              placeholder="Search clients by name, company, or type..."
                              className="pl-8 text-xs h-8"
                              autoFocus
                            />
                          </div>

                          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                            <span>
                              Showing {filteredClientList.length} client{filteredClientList.length === 1 ? "" : "s"}
                            </span>
                            <div className="flex items-center gap-2">
                              {filteredClientList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allIds = Array.from(new Set([...formAssignedClientIds, ...filteredClientList.map((c) => String(c.id))]));
                                    setFormAssignedClientIds(allIds);
                                  }}
                                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                                >
                                  Select All
                                </button>
                              )}
                              {formAssignedClientIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setFormAssignedClientIds([])}
                                  className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                            {filteredClientList.length === 0 ? (
                              <div className="py-4 text-center text-xs text-muted-foreground">
                                No clients found matching &quot;{clientSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredClientList.map((c) => {
                                const isChecked = formAssignedClientIds.includes(String(c.id));
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      if (isChecked) {
                                        const newIds = formAssignedClientIds.filter((id) => id !== String(c.id));
                                        setFormAssignedClientIds(newIds);
                                        if (newIds.length === 0) {
                                          setFormClientId("none");
                                          setFormClientName("");
                                        }
                                      } else {
                                        const newIds = [...formAssignedClientIds, String(c.id)];
                                        setFormAssignedClientIds(newIds);
                                        setFormClientId(String(newIds[0]));
                                        setFormClientName(c.company_name || c.name);
                                      }
                                    }}
                                    className={\`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs \${
                                      isChecked
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "hover:bg-muted"
                                    }\`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => {}}
                                        className="h-3.5 w-3.5"
                                      />
                                      <Building2 className={\`w-3.5 h-3.5 shrink-0 \${isChecked ? "text-primary" : "text-muted-foreground"}\`} />
                                      <div className="min-w-0">
                                        <span className="font-semibold text-foreground truncate block">
                                          {c.company_name || c.name}
                                        </span>
                                        {c.company_name && c.name && c.company_name !== c.name && (
                                          <span className="text-[10px] text-muted-foreground truncate block font-normal">
                                            {c.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50 capitalize ml-2">
                                      {c.client_type || "Client"}
                                    </Badge>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Clients Badges / Chips */}
                    {formAssignedClientIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {clients
                          .filter((c) => formAssignedClientIds.includes(String(c.id)))
                          .map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[11px] py-1 pl-2 pr-1.5 gap-1.5 font-medium bg-muted/60 hover:bg-muted"
                            >
                              <Building2 className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[150px]">{c.company_name || c.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newIds = formAssignedClientIds.filter((id) => id !== String(c.id));
                                  setFormAssignedClientIds(newIds);
                                  if (newIds.length === 0) {
                                    setFormClientId("none");
                                    setFormClientName("");
                                  }
                                }}
                                className="hover:bg-muted-foreground/20 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
`;

lines.splice(startIdx, (endIdx - 1) - startIdx, replacement);
fs.writeFileSync('app/admin/operations/tasks/page.tsx', lines.join('\n'), 'utf8');
console.log('Successfully updated modal client picker in tasks/page.tsx');

