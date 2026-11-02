const fs = require('fs');
let code = fs.readFileSync('app/admin/operations/tasks/page.tsx', 'utf8');

const isCRLF = code.includes('\r\n');
const nl = isCRLF ? '\r\n' : '\n';

const startMarker = '{/* MODAL 1: Create / Edit Task / Project */}';
const endMarker = '{/* MODAL 2: Dedicated Sub-Tasks Manager Modal */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found!", { startIndex, endIndex });
  process.exit(1);
}

const newModalCode = `{/* MODAL 1: Create / Edit Project */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-[94vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              <span>{editingTask ? "Edit Project" : "Create Project"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide project details, ownership, timeline, budget currency, project leader, and agreement document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMainTask} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Organization / Institution Selection (if multiple) */}
              {!isInstitutionAdmin && (
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Organization / Institution *
                    </Label>
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {isPlatformRoute ? "EduBird Platform" : "Staff Dedicated to Organization"}
                    </span>
                  </div>
                  {isPlatformRoute ? (
                    <div className="flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background/80 shadow-xs">
                      <span className="font-semibold text-foreground truncate flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        EduBird Organization
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                        EduBird Staff Only
                      </Badge>
                    </div>
                  ) : institutions.length > 1 ? (
                    <select
                      value={formInstitutionId}
                      onChange={(e) => handleFormInstitutionChange(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={String(inst.id)}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background/80">
                      <span className="font-semibold text-foreground truncate">
                        {activeInstitution?.name || institutions[0]?.name || "My Organization"}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                        Active Organization
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. EduBird LMS Portal Redesign, Enterprise Cloud Migration"
                  className="text-xs h-9"
                />
              </div>

              {/* Ownership: For Own Company or Client */}
              <div className="space-y-2.5 p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Project For *
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Select internal company or sales client</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormProjectFor("own_company");
                      setFormCompanyName("EduBird");
                      setFormClientId("none");
                      setFormClientName("EduBird");
                    }}
                    className={\`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                      formProjectFor === "own_company"
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-background hover:bg-muted/40 border-border text-muted-foreground"
                    }\`}
                  >
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Own Company (EduBird)</div>
                      <div className="text-[10px] text-muted-foreground">Assign for EduBird platform</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormProjectFor("client");
                      setFormCompanyName("");
                      if (formClientName === "EduBird") {
                        setFormClientName("");
                        setFormClientId("none");
                      }
                    }}
                    className={\`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer \${
                      formProjectFor === "client"
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                        : "bg-background hover:bg-muted/40 border-border text-muted-foreground"
                    }\`}
                  >
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Client</div>
                      <div className="text-[10px] text-muted-foreground">Select from sales client section</div>
                    </div>
                  </button>
                </div>

                {formProjectFor === "own_company" ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>This project will be assigned for internal company: <strong>EduBird</strong></span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Client Name (From Sales Client Section) *
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
                        {(formClientId !== "none" || formClientName) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormClientId("none");
                              setFormClientName("");
                              setClientSearchQuery("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Custom Searchable Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                        className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <span className={\`truncate text-left \${formClientId === "none" && !formClientName ? "text-muted-foreground" : "text-foreground font-medium flex items-center gap-2"}\`}>
                          {formClientId !== "none" ? (
                            (() => {
                              const c = clients.find((cl) => String(cl.id) === formClientId);
                              if (!c) return formClientName || "Selected Client";
                              return (
                                <>
                                  <span className="font-semibold text-foreground truncate">{c.company_name || c.name}</span>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal shrink-0">
                                    {c.client_type || "Client"}
                                  </Badge>
                                </>
                              );
                            })()
                          ) : formClientName ? (
                            <>
                              <span className="font-semibold text-foreground truncate">{formClientName}</span>
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground shrink-0">
                                Custom Client
                              </Badge>
                            </>
                          ) : (
                            "-- Select Client Account (Searchable) --"
                          )}
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
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                            {filteredClientList.length === 0 ? (
                              <div className="py-4 text-center text-xs text-muted-foreground">
                                No clients found matching &quot;{clientSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredClientList.map((c) => {
                                const isSelected = formClientId === String(c.id);
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      setFormClientId(String(c.id));
                                      setFormClientName(c.company_name || c.name);
                                      setClientDropdownOpen(false);
                                    }}
                                    className={\`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs \${
                                      isSelected
                                        ? "bg-primary/10 text-primary font-bold"
                                        : "hover:bg-muted"
                                    }\`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Building2 className={\`w-3.5 h-3.5 shrink-0 \${isSelected ? "text-primary" : "text-muted-foreground"}\`} />
                                      <div className="min-w-0">
                                        <span className="font-semibold text-foreground truncate block">
                                          {c.company_name || c.name}
                                        </span>
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
                  </div>
                )}
              </div>

              {/* Timeline: Start Date and Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Due Date / Deadline
                  </Label>
                  <Input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Project Cost & Multiple Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Currency
                  </Label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                  >
                    {PROJECT_CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Project Cost ({getCurrencySymbol(formCurrency)})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="e.g. 50000"
                    className="text-xs h-9 font-mono bg-background"
                  />
                </div>
              </div>

              {/* URLs: Live URL & Demo URL */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Live URL
                  </Label>
                  <Input
                    type="url"
                    value={formLiveUrl}
                    onChange={(e) => setFormLiveUrl(e.target.value)}
                    placeholder="https://app.example.com"
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    Demo URL
                  </Label>
                  <Input
                    type="url"
                    value={formDemoUrl}
                    onChange={(e) => setFormDemoUrl(e.target.value)}
                    placeholder="https://demo.example.com"
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Project Leader */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Select Project Leader
                </Label>
                <select
                  value={formProjectLeaderId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormProjectLeaderId(val);
                    const st = dialogStaffList.find((s) => String(s.id) === val);
                    setFormProjectLeaderName(st ? st.name : "");
                  }}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                >
                  <option value="none">-- Select Project Leader (Staff Member) --</option>
                  {dialogStaffList.map((st) => (
                    <option key={st.id} value={String(st.id)}>
                      {st.name} ({st.role || "Staff"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Agreement Document (PDF or Word) */}
              <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Agreement Document (PDF / Word)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Supported: .pdf, .doc, .docx</span>
                </div>

                {formAgreementDocUrl ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate max-w-[280px]">
                        {formAgreementDocName || "Agreement Document"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={formAgreementDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setFormAgreementDocUrl("");
                          setFormAgreementDocName("");
                        }}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded-md transition-colors"
                        title="Remove agreement document"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed hover:border-primary cursor-pointer bg-background/50 hover:bg-background transition-colors text-xs font-medium text-muted-foreground hover:text-foreground">
                    {uploadingAgreement ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Uploading Agreement Document...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-primary" />
                        <span>Click to upload Agreement Document (.pdf, .doc, .docx)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleUploadAgreement}
                      disabled={uploadingAgreement}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Assign to Staff Members (Team Members) */}
              {!isInstitutionAdmin && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      Assign Team Members ({selectedOrgName})
                    </Label>
                    {formAssignedStaffIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {formAssignedStaffIds.length} Selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormAssignedStaffIds([])}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multi-select dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                      className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-transparent shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <span className={\`truncate text-left \${formAssignedStaffIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}\`}>
                        {formAssignedStaffIds.length === 0
                          ? "-- Unassigned (Click to Select Team) --"
                          : formAssignedStaffIds.length === 1
                          ? (() => {
                              const s = dialogStaffList.find((st) => String(st.id) === formAssignedStaffIds[0]);
                              return s ? \`\${s.name} (\${s.role})\` : "1 staff member selected";
                            })()
                          : \`\${formAssignedStaffIds.length} staff members selected\`}
                      </span>
                      <ChevronDown className={\`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 \${staffDropdownOpen ? "rotate-180" : ""}\`} />
                    </button>

                    {staffDropdownOpen && (
                      <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <Input
                            value={staffSearchQuery}
                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                            placeholder="Search staff by name or role..."
                            className="pl-8 text-xs h-8"
                            autoFocus
                          />
                        </div>

                        <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                          <span>
                            Showing {filteredStaffList.length} staff member{filteredStaffList.length === 1 ? "" : "s"}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = Array.from(new Set([...formAssignedStaffIds, ...filteredStaffList.map((s) => String(s.id))]));
                                setFormAssignedStaffIds(allIds);
                              }}
                              className="text-primary hover:underline font-semibold"
                            >
                              Select All
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const removeIds = new Set(filteredStaffList.map((s) => String(s.id)));
                                setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => !removeIds.has(id)));
                              }}
                              className="hover:underline text-destructive font-semibold"
                            >
                              Deselect
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                          {loadingModalOrgStaff ? (
                            <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              <span>Loading staff members...</span>
                            </div>
                          ) : filteredStaffList.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              No staff members found matching &quot;{staffSearchQuery}&quot;
                            </div>
                          ) : (
                            filteredStaffList.map((s) => {
                              const isChecked = formAssignedStaffIds.includes(String(s.id));
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => id !== String(s.id)));
                                    } else {
                                      setFormAssignedStaffIds([...formAssignedStaffIds, String(s.id)]);
                                    }
                                  }}
                                  className={\`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs \${
                                    isChecked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                                  }\`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => {}}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-foreground truncate">{s.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{s.role} • {s.email}</div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {formAssignedStaffIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {dialogStaffList
                        .filter((s) => formAssignedStaffIds.includes(String(s.id)))
                        .map((s) => (
                          <Badge
                            key={s.id}
                            variant="secondary"
                            className="text-[11px] py-0.5 pl-2 pr-1 gap-1 font-medium bg-muted/80 hover:bg-muted border"
                          >
                            <span>{s.name}</span>
                            <span className="text-[9px] text-muted-foreground">({s.role})</span>
                            <button
                              type="button"
                              onClick={() => setFormAssignedStaffIds((prev) => prev.filter((id) => id !== String(s.id)))}
                              className="hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Project Scope / Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Scope & Deliverables (Optional)</Label>
                <Textarea
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="Describe project requirements, milestones, client specifications..."
                  className="text-xs min-h-[70px] resize-y"
                />
              </div>

              {/* Task Cadence / Frequency Selector */}
              {!isInstitutionAdmin && (
                <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Project Cadence *
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Daily vs One-Time</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsDailyRecurring(false)}
                      className={\`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all \${
                        !formIsDailyRecurring
                          ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                          : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                      }\`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        ⚡ Standard Project
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Deliverable workflow with milestones and sub-tasks.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormIsDailyRecurring(true)}
                      className={\`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all \${
                        formIsDailyRecurring
                          ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                          : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                      }\`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        🔁 Daily Recurring
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Regenerates daily with routine checks.
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3.5 border-t bg-muted/20 shrink-0">
              <ProgressiveSaveIndicator status={taskSaveStatus} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTaskDialogOpen(false);
                    clearTaskDraft();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingTask || uploadingAgreement} className="bg-primary font-bold">
                  {savingTask && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTask ? "Save Project Changes" : "Create Project & Continue to Sub-Tasks"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      `;

const formattedReplacement = isCRLF ? newModalCode.replace(/\n/g, '\r\n') : newModalCode;
code = code.substring(0, startIndex) + formattedReplacement + code.substring(endIndex);

fs.writeFileSync('app/admin/operations/tasks/page.tsx', code, 'utf8');
console.log("Successfully replaced Modal 1 dialog with the full Project Creation UI!");

